'use strict';
const assert = require('assert');
const { createMockDb } = require('./mockDb');
const M = require('../cloud/aiMeter');

function prices() {
	return {
		multiplier: 2,
		tz: 'America/Phoenix',
		models: {
			'gpt-4.1': { provider: 'openai', unit: '1M tokens', input: 2.0, cachedInput: 0.50, output: 8.0 },
			'gpt-4o-mini': { provider: 'openai', unit: '1M tokens', input: 0.15, cachedInput: 0.075, output: 0.60 }
		},
		speech: {
			'gpt-4o-mini-tts': { provider: 'openai', unit: '1M tokens', textInput: 0.60, audioOutput: 12.0, approxUsdPerSpokenMinute: 0.015 }
		},
		ocr: {
			DOCUMENT_TEXT_DETECTION: { provider: 'google-vision', unit: 'image', billTo: 'system', usdPerUnitAfterFree: 0.0015 }
		},
		video: {
			'grok-imagine-video': { provider: 'xai', unit: 'second', usdPerSecond: 0.05, preferProviderCost: true }
		}
	};
}

function deps(opts) {
	const d = Object.assign({
		db: createMockDb((opts && opts.store) || {
			'students/stu1': { createdBy: 'parent1', team: { parent1: { roles: ['parent'] }, teacher1: { roles: ['teacher'] } } },
			'students/stu-nopayer': { team: { parent1: true } }
		}),
		now: () => new Date('2026-11-17T20:00:00-07:00'),
		prices: prices(),
		log: () => {}
	}, opts || {});
	return d;
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('periodKey is America/Phoenix calendar month', () => {
	// 1 Nov 2026 00:30 UTC is still 31 Oct 5:30 PM Phoenix
	assert.strictEqual(M.periodKey(new Date('2026-11-01T00:30:00Z'), 'America/Phoenix'), '2026-10');
	assert.strictEqual(M.periodKey(new Date('2026-11-01T07:15:00Z'), 'America/Phoenix'), '2026-11');
});

test('computeCost applies 2x markup from table token rates', () => {
	// 1,000,000 in + 1,000,000 out of gpt-4.1 = $2 + $8 = $10 cost, $20 billed
	const c = M.computeCost(prices(), { model: 'gpt-4.1', tokensIn: 1e6, tokensOut: 1e6 });
	assert.strictEqual(c.source, 'table');
	assert.strictEqual(c.costMicros, 10 * 1e6);
	assert.strictEqual(c.billedMicros, 20 * 1e6);
	assert.strictEqual(c.multiplier, 2);
});

test('computeCost prefix-matches dotted model names', () => {
	const c = M.computeCost(prices(), { model: 'gpt-4.1-preview-x', tokensIn: 1e6, tokensOut: 0 });
	assert.strictEqual(c.modelKey, 'gpt-4.1');
	assert.strictEqual(c.costMicros, 2 * 1e6);
	assert.strictEqual(c.billedMicros, 4 * 1e6);
});

test('provider costUsd and xAI ticks skip the table and still get markup', () => {
	const a = M.computeCost(prices(), { costUsd: 0.5 });
	assert.strictEqual(a.source, 'provider');
	assert.strictEqual(a.costMicros, 500000);
	assert.strictEqual(a.billedMicros, 1000000);
	const b = M.computeCost(prices(), { costTicks: 2e10 }); // 2e10 / 1e10 = $2
	assert.strictEqual(b.source, 'provider');
	assert.strictEqual(b.costMicros, 2e6);
	assert.strictEqual(b.billedMicros, 4e6);
});

test('unknown model records zero cost with source unknown', () => {
	const c = M.computeCost(prices(), { model: 'mystery-model-9', tokensIn: 100 });
	assert.strictEqual(c.source, 'unknown');
	assert.strictEqual(c.costMicros, 0);
	assert.strictEqual(c.billedMicros, 0);
});

test('speech estimate from chars when no tokens', () => {
	const c = M.computeCost(prices(), { model: 'gpt-4o-mini-tts', chars: 1500 });
	assert.strictEqual(c.source, 'estimate');
	// 1500 chars / 1000 * 0.015 = 0.0225 → 22500 micros; billed 45000
	assert.strictEqual(c.costMicros, 22500);
	assert.strictEqual(c.billedMicros, 45000);
});

test('no studentId bills the jwt uid', async () => {
	const d = deps();
	const r = await M.record(d, { jwtUid: 'userA', feature: 'groups._gpt.chat', model: 'gpt-4o-mini', tokensIn: 1000, tokensOut: 400 });
	assert.strictEqual(r.billedUid, 'userA');
	assert.strictEqual(r.period, '2026-11');
	assert.ok(d.db._store['meterBill/ai-userA']);
	assert.strictEqual(d.db._store['meterBill/ai-userA'].createdBy, 'userA');
	assert.strictEqual(d.db._store['meterBill/ai-userA']._type, 'ai');
});

test('studentId bills createdBy after team check; actor stays the caller', async () => {
	const d = deps();
	const r = await M.record(d, { jwtUid: 'teacher1', studentId: 'stu1', feature: 'studio._evaluate', model: 'gpt-4.1-mini', costUsd: 0.01 });
	assert.strictEqual(r.billedUid, 'parent1');
	const doc = d.db._store['meterBill/ai-parent1'];
	assert.strictEqual(doc.createdBy, 'parent1');
	assert.strictEqual(doc.details.periods['2026-11'].byStudent.stu1.requests, 1);
	const ev = Object.keys(d.db._store).find(k => k.startsWith('meterBill/ai-parent1/aiEvents/'));
	assert.ok(ev);
	assert.strictEqual(d.db._store[ev].actorUid, 'teacher1');
	assert.strictEqual(d.db._store[ev].studentId, 'stu1');
	assert.strictEqual(d.db._store[ev].billedUid, 'parent1');
});

test('stranger jwt on a studentId is rejected and writes nothing', async () => {
	const d = deps();
	await assert.rejects(() => M.record(d, { jwtUid: 'stranger', studentId: 'stu1', feature: 'studio._tutor', tokensIn: 10 }), /not on student team/);
	assert.strictEqual(Object.keys(d.db._store).filter(k => k.startsWith('meterBill/')).length, 0);
});

test('client-sent billedUid / payer is ignored', async () => {
	const d = deps();
	const r = await M.record(d, { jwtUid: 'userA', billedUid: 'victim', payer: 'victim', createdBy: 'victim', feature: 'groups._gpt.chat', costUsd: 0.1 });
	assert.strictEqual(r.billedUid, 'userA');
	assert.ok(d.db._store['meterBill/ai-userA']);
	assert.ok(!d.db._store['meterBill/ai-victim']);
});

test('OCR and page analysis go to ai-system even with a jwt', async () => {
	const d = deps();
	const r = await M.record(d, { jwtUid: 'userA', feature: 'studio._ocr', model: 'DOCUMENT_TEXT_DETECTION', pages: 3 });
	assert.strictEqual(r.billedUid, 'system');
	assert.strictEqual(r.meterId, 'ai-system');
	assert.ok(d.db._store['meterBill/ai-system']);
	assert.strictEqual(d.db._store['meterBill/ai-system'].createdBy, 'system');
	const r2 = await M.record(d, { jwtUid: 'userA', feature: 'studio._pageAnalysis', costUsd: 0.02 });
	assert.strictEqual(r2.billedUid, 'system');
});

test('increments accumulate on the period and feature/model buckets', async () => {
	const d = deps();
	const input = { jwtUid: 'userA', feature: 'groups._gpt.chat', model: 'gpt-4.1', tokensIn: 1e6, tokensOut: 0 };
	await M.record(d, input);
	await M.record(d, input);
	const p = d.db._store['meterBill/ai-userA'].details.periods['2026-11'];
	assert.strictEqual(p.requests, 2);
	assert.strictEqual(p.costMicros, 4e6);
	assert.strictEqual(p.billedMicros, 8e6);
	assert.strictEqual(p.byFeature['groups._gpt.chat'].byModel['gpt-4.1'].requests, 2);
	assert.strictEqual(p.byFeature['groups._gpt.chat'].byModel['gpt-4.1'].billedMicros, 8e6);
	// dotted model key is a single field, not split into gpt-4 / 1
	assert.ok(p.byFeature['groups._gpt.chat'].byModel['gpt-4.1']);
	assert.ok(!p.byFeature.groups);
});

test('requestId is idempotent', async () => {
	const d = deps();
	const input = { jwtUid: 'userA', feature: 'groups._gpt.chat', model: 'gpt-4o-mini', costUsd: 1, requestId: 'req-abc' };
	const a = await M.record(d, input);
	const b = await M.record(d, input);
	assert.strictEqual(a.replay, false);
	assert.strictEqual(b.replay, true);
	assert.strictEqual(a.eventId, 'req-abc');
	assert.strictEqual(b.eventId, 'req-abc');
	assert.strictEqual(d.db._store['meterBill/ai-userA'].details.periods['2026-11'].requests, 1);
});

test('event expireAt is six months out', async () => {
	const d = deps();
	const r = await M.record(d, { jwtUid: 'userA', feature: 'groups._gpt.chat', costUsd: 0.01, requestId: 'exp1' });
	const ev = d.db._store['meterBill/ai-userA/aiEvents/exp1'];
	assert.ok(ev.expireAt);
	const months = (ev.expireAt.getFullYear() - ev.createdOn.getFullYear()) * 12 + (ev.expireAt.getMonth() - ev.createdOn.getMonth());
	assert.strictEqual(months, 6);
});

test('getPrices caches and falls back when the doc is missing', async () => {
	const db = createMockDb();
	const cache = { at: 0, value: null };
	let reads = 0;
	const orig = db.doc.bind(db);
	db.doc = p => {
		const ref = orig(p);
		if (p === M.PRICES_PATH) {
			return {
				path: p,
				async get() { reads++; return { exists: false, data: () => undefined }; }
			};
		}
		return ref;
	};
	const t0 = new Date('2026-11-17T18:00:00-07:00');
	let now = t0;
	const d = { db, pricesCache: cache, now: () => now, log: () => {} };
	const a = await M.getPrices(d);
	const b = await M.getPrices(d);
	assert.strictEqual(a.multiplier, 2);
	assert.strictEqual(a._fallback, true);
	assert.strictEqual(reads, 1);
	assert.strictEqual(b._fallback, true);
	now = new Date(t0.getTime() + 6 * 60 * 1000);
	await M.getPrices(d);
	assert.strictEqual(reads, 2);
});

test('getPrices uses a live doc when present', async () => {
	const db = createMockDb({ [M.PRICES_PATH]: { multiplier: 2, invoiceVendorId: 'manage', models: { 'gpt-4.1': { input: 2, output: 8 } } } });
	const got = await M.getPrices({ db, pricesCache: { at: 0, value: null }, now: () => new Date() });
	assert.strictEqual(got._fallback, false);
	assert.strictEqual(got.invoiceVendorId, 'manage');
	assert.ok(got.models['gpt-4.1']);
});

test('student with no createdBy does not write (skip)', async () => {
	const d = deps();
	await assert.rejects(() => M.record(d, { jwtUid: 'parent1', studentId: 'stu-nopayer', feature: 'studio._evaluate', costUsd: 1 }), /no createdBy/);
	assert.strictEqual(Object.keys(d.db._store).filter(k => k.startsWith('meterBill/')).length, 0);
});

test('recordSafe swallows errors and does not throw', async () => {
	const d = deps();
	const r = await M.recordSafe(d, { jwtUid: 'stranger', studentId: 'stu1', feature: 'studio._tutor' });
	assert.strictEqual(r.error, true);
	assert.strictEqual(r.code, 'auth');
});

test('_rate.price tracks the current month billed dollars', async () => {
	const d = deps();
	await M.record(d, { jwtUid: 'userA', feature: 'groups._gpt.chat', costUsd: 1.5 });
	assert.strictEqual(d.db._store['meterBill/ai-userA']._rate.price, 3);
});

test('fallback price table carries the default monthly cap', async () => {
	const db = createMockDb();
	const got = await M.getPrices({ db, pricesCache: { at: 0, value: null }, now: () => new Date(), log: () => {} });
	assert.strictEqual(got.userMonthlyLimitMicros, M.DEFAULT_LIMIT_MICROS);
	assert.strictEqual(got.userMonthlyLimitMicros, 25000000);
	assert.strictEqual(got.multiplier, 2);
	assert.strictEqual(got._fallback, true);
});

test('childId is ignored; only studentId selects a student payer', async () => {
	const d = deps();
	const r = await M.record(d, { jwtUid: 'teacher1', childId: 'stu1', feature: 'groups._gpt.chat', costUsd: 0.1 });
	assert.strictEqual(r.billedUid, 'teacher1');
	assert.ok(!d.db._store['meterBill/ai-parent1']);
	const gate = await M.check(d, { jwtUid: 'teacher1', childId: 'stu1', feature: 'groups._gpt.chat' });
	assert.strictEqual(gate.billedUid, 'teacher1');
});

test('check blocks at the default cap and honors a finite override', async () => {
	const d = deps({
		store: {
			'students/stu1': { createdBy: 'parent1', team: { parent1: { roles: ['parent'] }, teacher1: { roles: ['teacher'] } } },
			'meterBill/ai-userA': { limitMicros: null, details: { periods: { '2026-11': { billedMicros: 25000000 } } } },
			'meterBill/ai-userB': { details: { periods: { '2026-11': { billedMicros: 100 } } } },
			'meterBill/ai-userC': { limitMicros: 0, details: { periods: {} } },
			'meterBill/ai-userD': { limitMicros: -1, details: { periods: { '2026-11': { billedMicros: 9e9 } } } },
			'meterBill/ai-userE': { limitMicros: 1000, details: { periods: { '2026-11': { billedMicros: 1000 } } } }
		},
		prices: Object.assign(prices(), { userMonthlyLimitMicros: 25000000 }),
		spendCache: {}
	});
	const blocked = await M.check(d, { jwtUid: 'userA', feature: 'groups._gpt.chat' });
	assert.strictEqual(blocked.ok, false);
	assert.strictEqual(blocked.code, 'limit');
	assert.strictEqual(blocked.error, 'Monthly AI limit reached');
	const under = await M.check(d, { jwtUid: 'userB', feature: 'groups._gpt.chat' });
	assert.strictEqual(under.ok, true);
	assert.strictEqual(under.limitMicros, 25000000);
	const zero = await M.check(d, { jwtUid: 'userC', feature: 'groups._gpt.chat' });
	assert.strictEqual(zero.ok, false);
	assert.strictEqual(zero.limitMicros, 0);
	const open = await M.check(d, { jwtUid: 'userD', feature: 'groups._gpt.chat' });
	assert.strictEqual(open.ok, true);
	assert.strictEqual(open.unlimited, true);
	const tight = await M.check(d, { jwtUid: 'userE', feature: 'groups._gpt.chat' });
	assert.strictEqual(tight.ok, false);
	assert.strictEqual(tight.limitMicros, 1000);
});

test('check skips ai-system for OCR and outline', async () => {
	let meterReads = 0;
	const d = deps({
		store: {
			'students/stu1': { createdBy: 'parent1', team: { parent1: true } },
			'meterBill/ai-system': { limitMicros: 0, details: { periods: { '2026-11': { billedMicros: 9e9 } } } }
		},
		spendCache: {}
	});
	const orig = d.db.doc.bind(d.db);
	d.db.doc = p => {
		const ref = orig(p);
		if (p.indexOf('meterBill/') === 0) {
			return { path: p, get: async () => { meterReads++; return ref.get(); }, set: ref.set };
		}
		return ref;
	};
	const ocr = await M.check(d, { jwtUid: 'userA', feature: 'studio._ocr', pages: 2 });
	const outline = await M.check(d, { jwtUid: 'userA', feature: 'studio._pageAnalysis' });
	assert.strictEqual(ocr.ok, true);
	assert.strictEqual(ocr.skipped, true);
	assert.strictEqual(ocr.meterId, 'ai-system');
	assert.strictEqual(outline.skipped, true);
	assert.strictEqual(meterReads, 0);
});

test('check caches the cap for 15 seconds', async () => {
	let now = new Date('2026-11-17T20:00:00-07:00');
	let reads = 0;
	const d = deps({ now: () => now, spendCache: {} });
	const orig = d.db.doc.bind(d.db);
	d.db.doc = p => {
		const ref = orig(p);
		if (p.indexOf('meterBill/') === 0) {
			return { path: p, get: async () => { reads++; return ref.get(); }, set: ref.set };
		}
		return ref;
	};
	await M.check(d, { jwtUid: 'userA', feature: 'groups._gpt.chat' });
	await M.check(d, { jwtUid: 'userA', feature: 'groups._gpt.chat' });
	assert.strictEqual(reads, 1);
	assert.strictEqual(M.CHECK_CACHE_MS, 15000);
	now = new Date(now.getTime() + M.CHECK_CACHE_MS - 1);
	await M.check(d, { jwtUid: 'userA', feature: 'groups._gpt.chat' });
	assert.strictEqual(reads, 1);
	now = new Date(now.getTime() + 2);
	await M.check(d, { jwtUid: 'userA', feature: 'groups._gpt.chat' });
	assert.strictEqual(reads, 2);
});

test('check fails open on unexpected errors and stays closed on auth', async () => {
	const d = deps({ spendCache: {} });
	const orig = d.db.doc.bind(d.db);
	d.db.doc = p => {
		if (p.indexOf('meterBill/') === 0) throw new Error('firestore down');
		return orig(p);
	};
	const open = await M.check(d, { jwtUid: 'userA', feature: 'groups._gpt.chat' });
	assert.strictEqual(open.ok, true);
	assert.strictEqual(open.failOpen, true);
	const closed = await M.check(d, { jwtUid: 'stranger', studentId: 'stu1', feature: 'studio._tutor' });
	assert.strictEqual(closed.ok, false);
	assert.strictEqual(closed.code, 'auth');
	assert.ok(!closed.failOpen);
});

test('record bumps the cap cache; a replay does not', async () => {
	const d = deps({
		spendCache: {},
		prices: Object.assign(prices(), { userMonthlyLimitMicros: 3000000 })
	});
	await M.check(d, { jwtUid: 'userA', feature: 'groups._gpt.chat' });
	const input = { jwtUid: 'userA', feature: 'groups._gpt.chat', costUsd: 1, requestId: 'once' };
	await M.record(d, input);
	await M.record(d, input);
	const r = await M.check(d, { jwtUid: 'userA', feature: 'groups._gpt.chat' });
	assert.strictEqual(r.ok, true);
	assert.strictEqual(r.billedMicros, 2000000);
	assert.strictEqual(d.db._store['meterBill/ai-userA'].details.periods['2026-11'].requests, 1);
});

test('setLimit is admin-only and null clears the override', async () => {
	const d = deps({
		store: {
			'students/stu1': { createdBy: 'parent1', team: { parent1: true } },
			'roles/nobody': { admin: { other: true } },
			'roles/bill': { admin: { billing: true } },
			'roles/all': { admin: { all: true } },
			'roles/root': { root: { all: true } },
			'meterBill/ai-userA': {
				createdBy: 'userA',
				_type: 'ai',
				details: { periods: { '2026-11': { billedMicros: 10, requests: 1 } } }
			}
		},
		prices: Object.assign(prices(), { userMonthlyLimitMicros: 25000000 }),
		spendCache: {}
	});
	await assert.rejects(() => M.setLimit(d, { jwtUid: 'nobody', uid: 'userA', limitMicros: 5 }), /admin required/);
	assert.strictEqual(d.db._store['meterBill/ai-userA'].limitMicros, undefined);
	await M.check(d, { jwtUid: 'userA', feature: 'groups._gpt.chat' });
	const a = await M.setLimit(d, { jwtUid: 'bill', uid: 'userA', limitMicros: 5 });
	assert.strictEqual(a.ok, true);
	assert.strictEqual(d.db._store['meterBill/ai-userA'].limitMicros, 5);
	assert.strictEqual(d.db._store['meterBill/ai-userA'].createdBy, 'userA');
	assert.strictEqual(d.db._store['meterBill/ai-userA'].details.periods['2026-11'].requests, 1);
	const blocked = await M.check(d, { jwtUid: 'userA', feature: 'groups._gpt.chat' });
	assert.strictEqual(blocked.ok, false);
	assert.strictEqual(blocked.limitMicros, 5);
	await M.setLimit(d, { jwtUid: 'all', uid: 'userB', limitMicros: 9 });
	assert.strictEqual(d.db._store['meterBill/ai-userB'].limitMicros, 9);
	assert.strictEqual(d.db._store['meterBill/ai-userB']._type, 'ai');
	assert.strictEqual(d.db._store['meterBill/ai-userB'].createdBy, 'userB');
	await M.setLimit(d, { jwtUid: 'root', uid: 'userB', limitMicros: null });
	assert.strictEqual(d.db._store['meterBill/ai-userB'].limitMicros, null);
	assert.strictEqual(d.db._store['meterBill/ai-userB']._type, 'ai');
});

test('handlers call check and record with one argument', async () => {
	const db = createMockDb({
		'roles/root': { root: { all: true } }
	});
	M._useDb(db);
	try {
		const gate = await M.check({ jwtUid: 'userA', feature: 'groups._gpt.chat' });
		assert.strictEqual(gate.ok, true);
		assert.strictEqual(gate.limitMicros, 25000000);
		const table = await M.getPrices();
		assert.strictEqual(table.multiplier, 2);
		assert.strictEqual(table.userMonthlyLimitMicros, 25000000);
		const rec = await M.record({ jwtUid: 'userA', feature: 'groups._gpt.chat', costUsd: 0.25, requestId: 'one-arg' });
		assert.strictEqual(rec.billedUid, 'userA');
		const period = M.periodKey(new Date(), 'America/Phoenix');
		assert.strictEqual(db._store['meterBill/ai-userA'].details.periods[period].requests, 1);
		const safe = await M.recordSafe({ jwtUid: 'stranger', studentId: 'stu1', feature: 'studio._tutor' });
		assert.strictEqual(safe.error, true);
		assert.strictEqual(safe.code, 'auth');
		const payer = await M.resolvePayer({ jwtUid: 'userA', feature: 'groups._gpt.chat' });
		assert.strictEqual(payer.billedUid, 'userA');
	} finally {
		M._useDb(null);
	}
});

test('auto.js exposes aiMeter to cloud handlers', () => {
	const fs = require('fs');
	const path = require('path');
	const src = fs.readFileSync(path.join(__dirname, '../cloud/auto.js'), 'utf8');
	assert.ok(src.includes("var aiMeter") && src.includes("require('./aiMeter.js')"));
	assert.ok(src.includes('\taiMeter,'));
});

(async () => {
	let failed = 0;
	for (const t of tests) {
		try {
			await t.fn();
			console.log('ok -', t.name);
		} catch (e) {
			failed++;
			console.log('NOT OK -', t.name);
			console.log('  ', e && e.stack || e);
		}
	}
	console.log(tests.length - failed + '/' + tests.length, 'passed');
	process.exit(failed ? 1 : 0);
})();
