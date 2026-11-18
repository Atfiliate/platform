'use strict';
/**
 * Shared AI usage meter.
 *
 * Loaded by cloud/auto.js and left in that module's scope. Firestore cloud
 * handlers are eval'd there, so they call aiMeter.check / recordSafe the
 * same way they call Fire or Comm — no require(), no HTTP hop.
 *
 *   var gate = await aiMeter.check({ jwtUid, feature, studentId });
 *   aiMeter.recordSafe({ jwtUid, feature, model, tokensIn, tokensOut, requestId });
 *
 * db is the Admin SDK (firebase-admin), same as the rest of cloud/. Tests
 * pass a deps object with their own db. Handlers call the one-argument form.
 *
 * Firestore document paths must have an even number of segments, so the
 * price table is admin/ai/prices/current (not admin/ai/prices).
 */
const PRICES_PATH = 'admin/ai/prices/current';
const CACHE_MS = 5 * 60 * 1000;
const CHECK_CACHE_MS = 15 * 1000;
const DEFAULT_LIMIT_MICROS = 25000000;
const TZ = 'America/Phoenix';
const SYSTEM_UID = 'system';
const SYSTEM_FEATURES = {
	'studio._ocr': 1, // OCR
	'studio._pageAnalysis': 1 // outline
};

const FALLBACK_PRICES = {
	multiplier: 2,
	tz: TZ,
	currency: 'USD',
	invoiceVendorId: 'manage',
	minChargeCents: 100,
	userMonthlyLimitMicros: 25000000,
	_fallback: true,
	models: {
		'gpt-6.1-terra': { provider: 'openai', unit: '1M tokens', input: 1.0, cachedInput: 0.05, output: 5.0 },
		'gpt-6-luna': { provider: 'openai', unit: '1M tokens', input: 0.10, cachedInput: 0.01, output: 0.50 },
		'gpt-4.1': { provider: 'openai', unit: '1M tokens', input: 2.0, cachedInput: 0.50, output: 8.0 },
		'gpt-4.1-mini': { provider: 'openai', unit: '1M tokens', input: 0.40, cachedInput: 0.10, output: 1.60 },
		'gpt-4o-mini': { provider: 'openai', unit: '1M tokens', input: 0.15, cachedInput: 0.075, output: 0.60 }
	}
};

function usdToMicros(usd) {
	return Math.round((Number(usd) || 0) * 1e6);
}

function billedOf(costMicros, multiplier) {
	const m = Number(multiplier);
	return Math.round((Number(costMicros) || 0) * (Number.isFinite(m) && m > 0 ? m : 2));
}

function periodKey(now, tz) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: tz || TZ,
		year: 'numeric',
		month: '2-digit'
	}).formatToParts(now instanceof Date ? now : new Date(now));
	const get = t => parts.find(p => p.type === t).value;
	return get('year') + '-' + get('month');
}

function addMonths(date, n) {
	const d = new Date(date.getTime());
	d.setMonth(d.getMonth() + n);
	return d;
}

function safeId(v, fallback) {
	if (typeof v !== 'string' || !v || v.includes('/') || v.length > 128) return fallback || null;
	return v;
}

function isSystemFeature(feature, input) {
	if (input && input.billToSystem === true) return true;
	return !!(feature && SYSTEM_FEATURES[feature]);
}

function rateIn(row) {
	if (!row || typeof row !== 'object') return null;
	if (row.input != null) return Number(row.input);
	if (row.in != null) return Number(row.in);
	return null;
}
function rateCached(row) {
	if (!row || typeof row !== 'object') return 0;
	if (row.cachedInput != null) return Number(row.cachedInput);
	if (row.cached != null) return Number(row.cached);
	return 0;
}
function rateOut(row) {
	if (!row || typeof row !== 'object') return null;
	if (row.output != null) return Number(row.output);
	if (row.out != null) return Number(row.out);
	return null;
}

function allRateMaps(prices) {
	const maps = [];
	['models', 'speech', 'image', 'transcribe', 'music', 'video', 'ocr'].forEach(k => {
		if (prices && prices[k] && typeof prices[k] === 'object') maps.push(prices[k]);
	});
	return maps;
}

function lookupRate(prices, model) {
	if (!model) return { key: null, row: null };
	const name = String(model);
	let best = null, bestKey = null, bestLen = -1;
	allRateMaps(prices).forEach(map => {
		if (map[name]) {
			best = map[name];
			bestKey = name;
			bestLen = name.length;
			return;
		}
		Object.keys(map).forEach(k => {
			if (name.indexOf(k) === 0 && k.length > bestLen) {
				best = map[k];
				bestKey = k;
				bestLen = k.length;
			}
		});
	});
	return { key: bestKey, row: best };
}

function tokensCostUsd(row, tokensIn, tokensCached, tokensOut) {
	const input = rateIn(row);
	const output = rateOut(row);
	if (input == null && output == null) return null;
	const perM = 1e6;
	return ((Number(tokensIn) || 0) * (input || 0)
		+ (Number(tokensCached) || 0) * (rateCached(row) || 0)
		+ (Number(tokensOut) || 0) * (output || 0)) / perM;
}

function computeCost(prices, input) {
	const multiplier = (prices && Number(prices.multiplier)) || 2;
	let source = input.source || null;
	let costMicros = null;

	if (input.costMicros != null && isFinite(Number(input.costMicros))) {
		costMicros = Math.round(Number(input.costMicros));
		source = source || 'provider';
	} else if (input.costUsd != null && isFinite(Number(input.costUsd))) {
		costMicros = usdToMicros(input.costUsd);
		source = source || 'provider';
	} else if (input.costTicks != null && isFinite(Number(input.costTicks))) {
		// xAI cost_in_usd_ticks / 1e10
		costMicros = usdToMicros(Number(input.costTicks) / 1e10);
		source = source || 'provider';
	} else {
		const found = lookupRate(prices, input.model);
		const row = found.row;
		if (!row) {
			return {
				costMicros: 0,
				billedMicros: 0,
				source: 'unknown',
				multiplier,
				modelKey: input.model || null
			};
		}
		let usd = null;
		if (row.unit === '1M tokens' || rateIn(row) != null || row.textInput != null) {
			if (row.textInput != null || row.audioOutput != null) {
				const textTok = Number(input.tokensIn) || 0;
				const audioTok = Number(input.tokensOut) || 0;
				usd = (textTok / 1e6) * (Number(row.textInput) || 0)
					+ (audioTok / 1e6) * (Number(row.audioOutput) || 0);
				if (!textTok && !audioTok && (input.ms || input.chars) && row.approxUsdPerSpokenMinute) {
					const minutes = input.ms ? (Number(input.ms) / 60000)
						: (Number(input.chars) / 1000);
					usd = minutes * Number(row.approxUsdPerSpokenMinute);
					source = 'estimate';
				}
			} else {
				usd = tokensCostUsd(row, input.tokensIn, input.tokensCached, input.tokensOut);
			}
		}
		if (usd == null && row.usdPerMinute != null) {
			const minutes = input.ms != null ? (Number(input.ms) / 60000) : (Number(input.minutes) || 0);
			usd = minutes * Number(row.usdPerMinute);
		}
		if (usd == null && row.usdPerHour != null) {
			const hours = input.ms != null ? (Number(input.ms) / 3600000) : (Number(input.hours) || 0);
			usd = hours * Number(row.usdPerHour);
		}
		if (usd == null && row.usdPerSecond != null) {
			usd = (Number(input.seconds) || 0) * Number(row.usdPerSecond);
		}
		if (usd == null && (row.usdPerUnitAfterFree != null || row.usdPerUnit != null)) {
			const units = Number(input.pages) || Number(input.images) || Number(input.units) || 0;
			usd = units * Number(row.usdPerUnitAfterFree != null ? row.usdPerUnitAfterFree : row.usdPerUnit);
		}
		if (usd == null) {
			return {
				costMicros: 0,
				billedMicros: 0,
				source: 'unknown',
				multiplier,
				modelKey: found.key
			};
		}
		costMicros = usdToMicros(usd);
		source = source || 'table';
	}

	return {
		costMicros,
		billedMicros: billedOf(costMicros, multiplier),
		source: source || 'table',
		multiplier,
		modelKey: (lookupRate(prices, input.model).key) || input.model || null
	};
}

async function getPrices(deps) {
	const cache = deps.pricesCache || (deps.pricesCache = { at: 0, value: null });
	const now = deps.now ? deps.now() : new Date();
	if (cache.value && (now.getTime() - cache.at) < (deps.cacheMs || CACHE_MS)) return cache.value;
	try {
		const snap = await deps.db.doc(PRICES_PATH).get();
		if (snap && snap.exists) {
			const data = typeof snap.data === 'function' ? snap.data() : snap.data;
			if (data && typeof data === 'object') {
				cache.value = Object.assign({}, FALLBACK_PRICES, data, { _fallback: false });
				if (data.multiplier == null) cache.value.multiplier = 2;
				cache.at = now.getTime();
				return cache.value;
			}
		}
	} catch (e) {
		if (deps.log) deps.log('aiMeter getPrices', e && e.message);
	}
	cache.value = Object.assign({}, FALLBACK_PRICES);
	cache.at = now.getTime();
	return cache.value;
}

/**
 * Resolve who is billed. Never trusts client-sent billedUid / createdBy / payer.
 * If studentId is present, loads students/{studentId} and requires jwtUid to be
 * createdBy or a key in team. Bills createdBy (not the actor).
 * OCR / outline (or billToSystem) -> system.
 */
async function resolvePayer(db, input) {
	const feature = input.feature || '';
	if (isSystemFeature(feature, input)) {
		return { billedUid: SYSTEM_UID, actorUid: input.jwtUid || null, studentId: null, reason: 'system' };
	}
	const jwtUid = input.jwtUid;
	if (!jwtUid || typeof jwtUid !== 'string') {
		const err = new Error('jwt uid required');
		err.code = 'auth';
		throw err;
	}
	if (!input.studentId) {
		return { billedUid: jwtUid, actorUid: jwtUid, studentId: null, reason: 'jwt' };
	}
	const sid = safeId(input.studentId);
	if (!sid) {
		const err = new Error('bad studentId');
		err.code = 'request';
		throw err;
	}
	const snap = await db.doc('students/' + sid).get();
	const st = snap && snap.exists ? (typeof snap.data === 'function' ? snap.data() : snap.data) : null;
	if (!st) {
		const err = new Error('student not found');
		err.code = 'auth';
		throw err;
	}
	const team = st.team || {};
	if (!(st.createdBy === jwtUid || team[jwtUid] != null)) {
		const err = new Error('not on student team');
		err.code = 'auth';
		throw err;
	}
	if (!st.createdBy || typeof st.createdBy !== 'string') {
		const err = new Error('student has no createdBy');
		err.code = 'skip';
		throw err;
	}
	return { billedUid: st.createdBy, actorUid: jwtUid, studentId: sid, reason: 'createdBy' };
}

function meterId(billedUid) {
	return billedUid === SYSTEM_UID ? 'ai-system' : 'ai-' + billedUid;
}

function inc(obj, key, n) {
	const v = Number(n) || 0;
	if (!v) return;
	obj[key] = (Number(obj[key]) || 0) + v;
}

function bumpUnits(target, input, cost, requests) {
	inc(target, 'costMicros', cost.costMicros);
	inc(target, 'billedMicros', cost.billedMicros);
	inc(target, 'requests', requests);
	['tokensIn', 'tokensCached', 'tokensOut', 'chars', 'ms', 'images', 'pages', 'videos'].forEach(k => {
		if (input[k]) inc(target, k, input[k]);
	});
}

function clone(o) {
	return JSON.parse(JSON.stringify(o || {}));
}

async function record(deps, rawInput) {
	const input = Object.assign({}, rawInput || {});
	// never trust a client-sent payer; childId is not a billing key
	delete input.billedUid;
	delete input.payer;
	delete input.createdBy;
	delete input.parentUid;
	delete input.childId;

	const now = deps.now ? deps.now() : new Date();
	const prices = deps.prices || await getPrices(deps);
	const tz = prices.tz || TZ;
	const period = periodKey(now, tz);
	const payer = await resolvePayer(deps.db, input);
	const cost = computeCost(prices, input);
	const mid = meterId(payer.billedUid);
	const meterPath = 'meterBill/' + mid;
	const requestId = safeId(input.requestId);
	const eventId = requestId || ('evt_' + now.getTime().toString(36) + '_' + Math.random().toString(36).slice(2, 8));
	const eventPath = meterPath + '/aiEvents/' + eventId;

	const result = await deps.db.runTransaction(async t => {
		const meterRef = deps.db.doc(meterPath);
		const eventRef = deps.db.doc(eventPath);
		const evSnap = requestId ? await t.get(eventRef) : { exists: false };
		if (evSnap && evSnap.exists) {
			const ev = typeof evSnap.data === 'function' ? evSnap.data() : evSnap.data;
			return { replay: true, billedUid: payer.billedUid, period, eventId, costMicros: ev.costMicros, billedMicros: ev.billedMicros, source: ev.source };
		}
		const mSnap = await t.get(meterRef);
		const existing = mSnap && mSnap.exists ? clone(typeof mSnap.data === 'function' ? mSnap.data() : mSnap.data) : null;
		const doc = existing || {
			id: mid,
			createdBy: payer.billedUid,
			createdOn: now,
			_type: 'ai',
			_status: 'active',
			_acl: { view: 'users', id: payer.billedUid, role: 'owner' },
			_config: { title: 'AI usage', status: 'active' },
			_rate: { price: 0, quantity: 1, unit: 'usd', repeat: 'monthly' },
			details: { tz, multiplier: cost.multiplier, periods: {} }
		};
		doc.updatedOn = now;
		doc.details = doc.details || {};
		doc.details.tz = doc.details.tz || tz;
		doc.details.multiplier = cost.multiplier;
		doc.details.periods = doc.details.periods || {};
		const p = doc.details.periods[period] || (doc.details.periods[period] = {});
		bumpUnits(p, input, cost, 1);

		const feature = input.feature || 'unknown';
		p.byFeature = p.byFeature || {};
		const f = p.byFeature[feature] || (p.byFeature[feature] = {});
		bumpUnits(f, input, cost, 1);
		if (input.model) {
			f.byModel = f.byModel || {};
			const mo = f.byModel[input.model] || (f.byModel[input.model] = {});
			bumpUnits(mo, input, cost, 1);
		}
		if (payer.studentId) {
			p.byStudent = p.byStudent || {};
			const s = p.byStudent[payer.studentId] || (p.byStudent[payer.studentId] = {});
			bumpUnits(s, input, cost, 1);
		}

		doc._rate = doc._rate || { quantity: 1, unit: 'usd', repeat: 'monthly' };
		doc._rate.price = (Number(p.billedMicros) || 0) / 1e6;

		const event = {
			createdOn: now,
			expireAt: addMonths(now, 6),
			period,
			provider: input.provider || null,
			model: input.model || null,
			feature,
			billedUid: payer.billedUid,
			actorUid: payer.actorUid,
			costMicros: cost.costMicros,
			billedMicros: cost.billedMicros,
			multiplier: cost.multiplier,
			source: cost.source,
			requestId: requestId || eventId
		};
		if (payer.studentId) event.studentId = payer.studentId;
		['tokensIn', 'tokensCached', 'tokensOut', 'chars', 'ms', 'images', 'pages', 'videos', 'bookId', 'studioId', 'pgId'].forEach(k => {
			if (input[k] != null && input[k] !== '') event[k] = input[k];
		});

		if (typeof t.set === 'function') {
			t.set(meterRef, doc);
			t.set(eventRef, event);
		} else {
			await meterRef.set(doc);
			await eventRef.set(event);
		}
		return {
			replay: false,
			billedUid: payer.billedUid,
			meterId: mid,
			period,
			eventId,
			costMicros: cost.costMicros,
			billedMicros: cost.billedMicros,
			source: cost.source,
			multiplier: cost.multiplier
		};
	});
	if (result && !result.replay)
		noteSpend(deps, result.billedUid, result.period, result.billedMicros);
	return result;
}

async function recordSafe(deps, input) {
	try {
		return await record(deps, input);
	} catch (e) {
		if (deps && deps.log) deps.log('aiMeter record failed', e && e.code, e && e.message);
		return { error: true, code: e && e.code, message: e && e.message };
	}
}

function spendCacheOf(deps) {
	if (!deps.spendCache) deps.spendCache = Object.create(null);
	return deps.spendCache;
}

function spendKey(uid, period) {
	return uid + '|' + period;
}

function noteSpend(deps, billedUid, period, addMicros) {
	if (!deps || !deps.spendCache || !billedUid || billedUid === SYSTEM_UID) return;
	const row = deps.spendCache[spendKey(billedUid, period)];
	if (!row) return;
	const now = deps.now ? deps.now() : new Date();
	const ttl = deps.checkCacheMs || CHECK_CACHE_MS;
	if ((now.getTime() - row.at) >= ttl) return;
	row.billedMicros = (Number(row.billedMicros) || 0) + (Number(addMicros) || 0);
}

function clearSpend(deps, uid) {
	if (!deps || !deps.spendCache || !uid) return;
	const prefix = uid + '|';
	Object.keys(deps.spendCache).forEach(k => {
		if (k.indexOf(prefix) === 0) delete deps.spendCache[k];
	});
}

function resolveLimit(prices, meterDoc) {
	const override = meterDoc && meterDoc.limitMicros;
	if (typeof override === 'number' && Number.isFinite(override)) return override;
	const fallback = prices && prices.userMonthlyLimitMicros;
	if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback;
	return DEFAULT_LIMIT_MICROS;
}

function docData(snap) {
	if (!snap || !snap.exists) return null;
	return typeof snap.data === 'function' ? snap.data() : snap.data;
}

function hasRole(roles, group, name) {
	if (!roles || typeof roles !== 'object') return false;
	const g = roles[group];
	if (!g || typeof g !== 'object') return false;
	return !!g[name];
}

function isBillingAdmin(roles) {
	return hasRole(roles, 'admin', 'billing') || hasRole(roles, 'admin', 'all') || hasRole(roles, 'root', 'all');
}

function coded(message, code) {
	const err = new Error(message);
	err.code = code;
	return err;
}

function stripClientPayer(raw) {
	const input = Object.assign({}, raw || {});
	delete input.billedUid;
	delete input.payer;
	delete input.createdBy;
	delete input.parentUid;
	delete input.childId;
	return input;
}

/**
 * Monthly billed-dollar cap. Skip ai-system. Fail open on unexpected errors.
 * Auth / request / missing-payer failures stay closed (ok: false).
 * limitMicros on the meter doc, when a finite number, replaces the price-table default:
 * null or missing = default, 0 = blocked, negative = no cap.
 */
async function check(deps, rawInput) {
	try {
		const input = stripClientPayer(rawInput);
		const payer = await resolvePayer(deps.db, input);
		if (payer.billedUid === SYSTEM_UID) {
			return { ok: true, skipped: true, billedUid: SYSTEM_UID, meterId: 'ai-system', reason: payer.reason };
		}
		const now = deps.now ? deps.now() : new Date();
		const prices = deps.prices || await getPrices(deps);
		const period = periodKey(now, (prices && prices.tz) || TZ);
		const cache = spendCacheOf(deps);
		const key = spendKey(payer.billedUid, period);
		const ttl = deps.checkCacheMs || CHECK_CACHE_MS;
		let billedMicros, limitMicros;
		const cached = cache[key];
		if (cached && (now.getTime() - cached.at) < ttl) {
			billedMicros = Number(cached.billedMicros) || 0;
			limitMicros = cached.limitMicros;
		} else {
			const snap = await deps.db.doc('meterBill/' + meterId(payer.billedUid)).get();
			const doc = docData(snap);
			limitMicros = resolveLimit(prices, doc);
			const periodRow = doc && doc.details && doc.details.periods && doc.details.periods[period];
			billedMicros = (periodRow && Number(periodRow.billedMicros)) || 0;
			cache[key] = { at: now.getTime(), billedMicros, limitMicros };
		}
		const base = {
			billedUid: payer.billedUid,
			meterId: meterId(payer.billedUid),
			period,
			billedMicros,
			limitMicros
		};
		if (typeof limitMicros === 'number' && limitMicros < 0)
			return Object.assign({ ok: true, unlimited: true }, base);
		if (billedMicros >= limitMicros)
			return Object.assign({ ok: false, code: 'limit', error: 'Monthly AI limit reached' }, base);
		return Object.assign({ ok: true }, base);
	} catch (e) {
		if (e && (e.code === 'auth' || e.code === 'request' || e.code === 'skip'))
			return { ok: false, code: e.code, error: e.message };
		if (deps && deps.log) deps.log('aiMeter check failed open', e && e.code, e && e.message);
		return { ok: true, failOpen: true };
	}
}

/**
 * Admin-only cap override. roles/{jwtUid} must have admin.billing, admin.all, or root.all.
 * limitMicros null clears the override. Creates meterBill/ai-{uid} when it is missing.
 */
async function setLimit(deps, rawInput) {
	const input = rawInput || {};
	const jwtUid = input.jwtUid;
	if (!jwtUid || typeof jwtUid !== 'string' || !safeId(jwtUid))
		throw coded('jwt uid required', 'auth');
	const actor = safeId(jwtUid);
	const roleSnap = await deps.db.doc('roles/' + actor).get();
	if (!isBillingAdmin(docData(roleSnap)))
		throw coded('admin required', 'auth');
	const uid = safeId(input.uid);
	if (!uid)
		throw coded('bad uid', 'request');
	if (!Object.prototype.hasOwnProperty.call(input, 'limitMicros'))
		throw coded('limitMicros required', 'request');
	if (input.limitMicros !== null && (typeof input.limitMicros !== 'number' || !Number.isFinite(input.limitMicros)))
		throw coded('bad limitMicros', 'request');
	const limitMicros = input.limitMicros === null ? null : input.limitMicros;
	const now = deps.now ? deps.now() : new Date();
	const mid = meterId(uid);
	const ref = deps.db.doc('meterBill/' + mid);
	const existing = docData(await ref.get());
	if (!existing) {
		await ref.set({
			id: mid,
			createdBy: uid,
			createdOn: now,
			updatedOn: now,
			_type: 'ai',
			_status: 'active',
			_acl: { view: 'users', id: uid, role: 'owner' },
			_config: { title: 'AI usage', status: 'active' },
			_rate: { price: 0, quantity: 1, unit: 'usd', repeat: 'monthly' },
			details: { tz: TZ, periods: {} },
			limitMicros
		});
	} else if (typeof ref.set === 'function') {
		await ref.set({ limitMicros, updatedOn: now }, { merge: true });
	} else {
		existing.limitMicros = limitMicros;
		existing.updatedOn = now;
		await ref.set(existing);
	}
	clearSpend(deps, uid);
	return { ok: true, uid, meterId: mid, limitMicros };
}

// Admin SDK, same lookup cloud/auto.js uses. Call-time so init order does not matter.
// Tests inject a db through deps or _useDb and never need this.
let firebaseAdmin = null;
let firebaseAdminMissing = false;
let dbOverride = null;

function defaultDb() {
	if (dbOverride) return dbOverride;
	if (firebaseAdminMissing) return null;
	if (!firebaseAdmin) {
		try {
			firebaseAdmin = require('firebase-admin');
		} catch (e) {
			firebaseAdminMissing = true;
			return null;
		}
	}
	try {
		if (firebaseAdmin.apps && firebaseAdmin.apps.length)
			return firebaseAdmin.firestore();
	} catch (e) {}
	return null;
}

const sharedPricesCache = { at: 0, value: null };
const sharedSpendCache = Object.create(null);

function defaultLog(message, code, detail) {
	console.error(message || 'aiMeter', code || '', detail || '');
}

function defaultDeps() {
	return {
		db: defaultDb(),
		pricesCache: sharedPricesCache,
		spendCache: sharedSpendCache,
		log: defaultLog
	};
}

function isDeps(x) {
	return !!(x && typeof x === 'object' && (x.db || x.pricesCache || x.spendCache || x.now));
}

function bindDeps(fn) {
	return function(a, b) {
		if (arguments.length >= 2) return fn(a, b);
		return fn(defaultDeps(), a);
	};
}

function useDb(next) {
	dbOverride = next || null;
}

module.exports = {
	PRICES_PATH,
	CACHE_MS,
	CHECK_CACHE_MS,
	DEFAULT_LIMIT_MICROS,
	TZ,
	SYSTEM_UID,
	FALLBACK_PRICES,
	usdToMicros,
	billedOf,
	periodKey,
	addMonths,
	lookupRate,
	computeCost,
	getPrices: function(deps) {
		if (isDeps(deps)) return getPrices(deps);
		return getPrices(defaultDeps());
	},
	resolvePayer: function(a, b) {
		if (arguments.length >= 2) return resolvePayer(a, b);
		return resolvePayer(defaultDb(), a);
	},
	meterId,
	record: bindDeps(record),
	recordSafe: bindDeps(recordSafe),
	check: bindDeps(check),
	setLimit: bindDeps(setLimit),
	_useDb: useDb
};
