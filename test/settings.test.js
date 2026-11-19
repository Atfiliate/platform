// Run: node --test test/settings.test.js
// Site settings (cloud/settings.js), the /__core/settings route and the BETA bar in the page shell. No network.
const test = require('node:test');
const assert = require('assert');
const path = require('path');
const ejs = require('ejs');
const S = require('../cloud/settings.js');
const route = require('../cloud/settingsRoute.js');

const quiet = {warn: ()=>{}, error: ()=>{}};
const site = {
	tutorModel: {type: 'string', label: 'Tutor model', group: 'AI', default: 'model-a'},
	tutorMaxOut: {type: 'integer', min: 100, max: 50000, default: 5000},
	tutorOn: {type: 'boolean', default: true},
	admins: {type: 'list', pattern: '^[A-Za-z0-9]{6,128}$', default: []},
	invoicePage: {type: 'url'},
	mailDomain: {type: 'string', required: true, pattern: '^[a-z0-9.-]+$'}
};

test('core schema is valid and environment defaults to production', ()=>{
	Object.entries(S.CORE).forEach(([k, d])=>assert.deepStrictEqual(S.checkDef(k, d), []));
	let s = S.create({log: quiet});
	s.load({});
	assert.strictEqual(s.get('environment'), 'production');
	assert.deepStrictEqual(s.publicValues(), {environment: 'production'});
});

test('not loaded yet: SETTINGS_NOT_READY (named)', ()=>{
	let s = S.create({log: quiet});
	assert.throws(()=>s.get('environment'), e=>e.code == 'SETTINGS_NOT_READY' && e.setting == 'environment');
});

test('site schema merges; stored values are typed; defaults; unknown and missing are named', ()=>{
	let s = S.create({log: quiet});
	s.load({schema: site, values: {environment: 'beta', tutorMaxOut: 7000, admins: [' abcdef1 ', ''], mailDomain: 'mail.example.test', stray: 1}});
	assert.strictEqual(s.get('environment'), 'beta');
	assert.strictEqual(s.get('tutorMaxOut'), 7000);
	assert.strictEqual(s.get('tutorModel'), 'model-a');
	assert.strictEqual(s.get('tutorOn'), true);
	assert.deepStrictEqual(s.get('admins'), ['abcdef1']);
	assert.strictEqual(s.get('invoicePage'), null);
	assert.throws(()=>s.get('nope'), e=>e.code == 'SETTING_UNKNOWN');
	assert.ok(s.problems().some(p=>p.code == 'SETTING_UNKNOWN' && p.name == 'stray'));
	// a returned list is a copy
	s.get('admins').push('x');
	assert.deepStrictEqual(s.get('admins'), ['abcdef1']);
});

test('required with no value: SETTING_MISSING; bad stored value: SETTING_INVALID (no fallback to env or default)', ()=>{
	process.env.tutorMaxOut = '9999';
	let s = S.create({log: quiet});
	s.load({schema: site, values: {tutorMaxOut: '7000', environment: 'staging'}});
	assert.throws(()=>s.get('mailDomain'), e=>e.code == 'SETTING_MISSING');
	assert.throws(()=>s.get('tutorMaxOut'), e=>e.code == 'SETTING_INVALID');
	assert.throws(()=>s.get('environment'), e=>e.code == 'SETTING_INVALID');
	assert.deepStrictEqual(s.publicValues(), {});
	let codes = s.problems().map(p=>p.code + ' ' + p.name);
	assert.ok(codes.includes('SETTING_MISSING mailDomain') && codes.includes('SETTING_INVALID tutorMaxOut'));
	delete process.env.tutorMaxOut;
});

test('a site entry cannot reuse a core name; broken definitions are dropped and named', ()=>{
	let s = S.create({log: quiet});
	s.load({schema: {environment: {type: 'string'}, bad: {type: 'weird'}, ok1: {type: 'enum', options: []}, x: {type: 'string', secret: true}}});
	let codes = s.problems().map(p=>p.code + ' ' + p.name);
	assert.ok(codes.includes('SCHEMA_CONFLICT environment'));
	assert.ok(codes.includes('SCHEMA_INVALID bad') && codes.includes('SCHEMA_INVALID ok1') && codes.includes('SCHEMA_INVALID x'));
	assert.strictEqual(s.get('environment'), 'production');
	assert.throws(()=>s.get('bad'), e=>e.code == 'SETTING_UNKNOWN');
});

test('types: coerce accepts and rejects', ()=>{
	let ok = (d, v)=>S.coerce(d, v).value, bad = (d, v)=>!!S.coerce(d, v).error;
	assert.strictEqual(ok({type: 'url'}, ' https://a.test/x '), 'https://a.test/x');
	assert.ok(bad({type: 'url'}, 'http://a.test') && bad({type: 'url'}, 'javascript:alert(1)'));
	assert.ok(bad({type: 'email'}, 'nope') && ok({type: 'email'}, 'a@b.co'));
	assert.ok(bad({type: 'integer'}, 1.5) && bad({type: 'number'}, NaN) && bad({type: 'number', max: 1}, 2));
	assert.ok(bad({type: 'boolean'}, 'true') && ok({type: 'boolean'}, false) === false);
	assert.ok(bad({type: 'enum', options: ['a']}, 'b'));
	assert.ok(bad({type: 'list'}, 'a,b') && bad({type: 'json'}, 'x'));
	assert.ok(bad({type: 'string', maxLength: 3}, 'abcd'));
});

test('validate: unknown, invalid, required-empty are named; null unsets', ()=>{
	let s = S.create({log: quiet});
	s.load({schema: site});
	let r = s.validate({environment: 'beta', tutorMaxOut: 1, nope: 'x', mailDomain: '', invoicePage: null});
	let codes = r.errors.map(e=>e.code + ' ' + e.name);
	assert.deepStrictEqual(codes.sort(), ['SETTING_INVALID tutorMaxOut', 'SETTING_MISSING mailDomain', 'SETTING_UNKNOWN nope']);
	r = s.validate({environment: 'beta', invoicePage: null});
	assert.deepStrictEqual(r, {errors: [], values: {environment: 'beta', invoicePage: null}});
	assert.strictEqual(s.validate({}).errors[0].code, 'SETTINGS_INVALID');
	assert.strictEqual(s.validate([1]).errors[0].code, 'SETTINGS_INVALID');
});

function fakeDb(initial){
	let store = {'admin/settings': initial}, logs = [], ops = [];
	let db = {
		doc: p=>({path: p}),
		collection: p=>({doc: ()=>({path: p + '/new'})}),
		runTransaction: fn=>fn({
			get: ref=>Promise.resolve({exists: store[ref.path] !== undefined, data: ()=>JSON.parse(JSON.stringify(store[ref.path]))}),
			update: (ref, d)=>{ ops.push('update'); store[ref.path] = Object.assign({}, store[ref.path], d); },
			set: (ref, d)=>{ ops.push('set'); if(ref.path.endsWith('/new')) logs.push(d); else store[ref.path] = d; }
		})
	};
	return {db, store, logs, ops};
}

test('write: replaces values (an unset key is really removed), logs names only', async ()=>{
	let s = S.create({log: quiet});
	let data = {domain: 'keep', schema: site, values: {environment: 'production', invoicePage: 'https://a.test/i', mailDomain: 'm.test'}};
	s.load(data);
	let f = fakeDb(data);
	let r = await s.write({db: f.db, uid: 'u1', patch: {environment: 'beta', invoicePage: null}});
	assert.deepStrictEqual(r, {saved: ['environment', 'invoicePage']});
	assert.deepStrictEqual(f.store['admin/settings'].values, {environment: 'beta', mailDomain: 'm.test'});
	assert.strictEqual(f.store['admin/settings'].domain, 'keep');
	assert.strictEqual(f.store['admin/settings'].valuesMeta.updatedBy, 'u1');
	assert.deepStrictEqual(f.ops, ['update', 'set']);
	assert.deepStrictEqual(Object.keys(f.logs[0]).sort(), ['at', 'by', 'keys', 'scope', 'unset']);
	await assert.rejects(s.write({db: f.db, uid: 'u1', patch: {environment: 'x'}}), e=>e.status == 400 && e.errors[0].code == 'SETTING_INVALID');
});

test('watch: loads from the admin/settings snapshot and calls onChange', async ()=>{
	let s = S.create({log: quiet}), seen = [], cb;
	s.onChange(raw=>seen.push(raw.domain));
	s.watch({doc: p=>({onSnapshot: (ok)=>{ assert.strictEqual(p, 'admin/settings'); cb = ok; }})});
	let waiting = s.ready(1000);
	cb({exists: true, data: ()=>({domain: 'd', values: {environment: 'beta'}})});
	assert.strictEqual(await waiting, true);
	assert.strictEqual(s.get('environment'), 'beta');
	assert.deepStrictEqual(seen, ['d']);
	assert.strictEqual(await S.create({log: quiet}).ready(20), false);
});

test('canManage: root, admin.all, admin.settings only', ()=>{
	assert.ok(S.canManage({root: true}) && S.canManage({root: {all: true}}) && S.canManage({admin: {all: true}}) && S.canManage({admin: {settings: true}}));
	assert.ok(!S.canManage(null) && !S.canManage({admin: {accounts: true}}) && !S.canManage({developer: {all: true}}) && !S.canManage({admin: {settings: 'yes'}}));
});

function res(){
	let out = {status: 200, headers: {}};
	let r = {setHeader: (k, v)=>{ out.headers[k] = v; }, status: s=>{ out.status = s; return r; }, json: b=>{ out.body = b; out.done(); }};
	out.wait = new Promise(ok=>out.done = ok);
	return {r, out};
}
function mkRoute(roles){
	let s = S.create({log: quiet});
	s.load({schema: site, values: {mailDomain: 'm.test'}});
	let f = fakeDb({values: {mailDomain: 'm.test'}});
	return {f, rt: route.create({settings: s, db: ()=>f.db,
		auth: ()=>({verifyIdToken: t=>t == 'good' ? Promise.resolve({uid: 'u1'}) : Promise.reject(new Error('bad'))}),
		getRoles: ()=>Promise.resolve(roles)})};
}

test('route: 401 without or with a bad token, 403 without a settings role, 200 for admin.settings', async ()=>{
	let {rt} = mkRoute({admin: {settings: true}});
	for(let [h, code] of [[undefined, 'AUTH_REQUIRED'], ['Bearer bad', 'AUTH_INVALID']]){
		let {r, out} = res();
		rt.read({headers: {authorization: h}}, r); await out.wait;
		assert.strictEqual(out.status, 401); assert.strictEqual(out.body.errors[0].code, code);
	}
	let x = mkRoute({admin: {accounts: true}}), y = res();
	x.rt.read({headers: {authorization: 'Bearer good'}}, y.r); await y.out.wait;
	assert.strictEqual(y.out.status, 403);
	let z = res();
	rt.read({headers: {authorization: 'Bearer good'}}, z.r); await z.out.wait;
	assert.strictEqual(z.out.status, 200);
	assert.strictEqual(z.out.headers['Cache-Control'], 'no-store');
	let env = z.out.body.settings.find(i=>i.key == 'environment');
	assert.strictEqual(env.source, 'core'); assert.strictEqual(env.value, null); assert.strictEqual(env.default, 'production');
});

test('route: save validates on the server (400 named) and writes', async ()=>{
	let {rt, f} = mkRoute({root: true});
	let a = res();
	rt.save({headers: {authorization: 'Bearer good'}, body: {values: {environment: 'staging'}}}, a.r); await a.out.wait;
	assert.strictEqual(a.out.status, 400); assert.strictEqual(a.out.body.errors[0].code, 'SETTING_INVALID');
	let b = res();
	rt.save({headers: {authorization: 'Bearer good'}, body: {values: {environment: 'beta'}}}, b.r); await b.out.wait;
	assert.strictEqual(b.out.status, 200); assert.deepStrictEqual(b.out.body.saved, ['environment']);
	assert.strictEqual(f.store['admin/settings'].values.environment, 'beta');
});

const views = path.join(__dirname, '../views');
function page(env){
	return ejs.renderFile(path.join(views, 'pages/index.ejs'), {config: {title: 'T'}, shell: {version: 1}, env}, {views: [views]});
}
test('page shell: BETA bars and frame only when environment is beta', async ()=>{
	let beta = await page({name: 'beta', beta: true});
	assert.strictEqual((beta.match(/class="core-env-bar /g) || []).length, 2);
	assert.ok(/core-env-bar--top[^>]*>BETA</.test(beta) && /core-env-bar--bottom[^>]*>BETA</.test(beta));
	let top = beta.indexOf('<div class="core-env-bar core-env-bar--top"'), view = beta.indexOf('ng-view'), bottom = beta.indexOf('<div class="core-env-bar core-env-bar--bottom"');
	assert.ok(top > beta.indexOf('<body') && top < view && view < bottom && bottom < beta.indexOf('</body>'));
	assert.ok(beta.includes('pointer-events:none'));
	for(let env of [{name: 'production', beta: false}, {name: null, beta: false}, undefined]){
		let html = await page(env);
		assert.ok(!html.includes('core-env-bar') && !html.includes('core-env-beta'));
	}
});

test('watch error: named, waiters released (no hang), retried', async ()=>{
	let errs = [], calls = 0, fail;
	let s = S.create({log: {warn: ()=>{}, error: (c)=>errs.push(c)}});
	s.watch({doc: ()=>({onSnapshot: (ok, bad)=>{ calls++; fail = bad; }})});
	let waiting = s.ready(5000);
	fail(new Error('PERMISSION_DENIED'));
	assert.strictEqual(await waiting, false);
	assert.strictEqual(await s.ready(5000), false);
	assert.deepStrictEqual(errs, ['SETTINGS_WATCH_FAILED']);
	assert.strictEqual(calls, 1);
});
