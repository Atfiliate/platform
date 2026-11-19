// Run: node test/siteRoute.test.js
// Loads cloud/auto.js with stubbed dependencies (no network, no Firebase).
const assert = require('assert');
const Module = require('module');
const path = require('path');

const tests = [];
const test = (name, fn)=>tests.push({name, fn});

// ---- stubs ----
let rtdbCalls = 0;
let siteDoc = null; // what dev/site returns to auto.startup()
let devListener = null;
let mstore = {};
const stubs = {
	'firebase-admin': {
		apps: [{}],
		firestore: ()=>({
			collection: (p)=>({
				onSnapshot: (cb)=>{ if(p == 'dev') devListener = cb; return ()=>{}; },
				doc: (id)=>({get: ()=>siteDoc instanceof Error ? Promise.reject(siteDoc) : Promise.resolve({id, exists: !!siteDoc, data: ()=>siteDoc})})
			}),
			// admin/settings: the legacy cloud route reads $settings.subSite[host]
			doc: (p)=>({get: ()=>Promise.resolve({id: p.split('/').pop(), ref: {}, exists: true, data: ()=>({subSite: {}})})})
		}),
		database: ()=>{ rtdbCalls++; throw new Error('RTDB must not be used'); },
		auth: ()=>({})
	},
	'firebase-admin/messaging': {getMessaging: ()=>({})},
	'request': function(){},
	'request-promise': function(){},
	'cloudinary': {config: ()=>{}, v2: {}},
	'moment-timezone': function(){},
	'memory-cache': {get: k=>mstore[k], put: (k, v)=>{ mstore[k] = v; }}
};
const origLoad = Module._load;
Module._load = function(request, parent, isMain){
	if(Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	return origLoad.apply(this, arguments);
};
let warnings = [];
const origWarn = console.warn;
console.warn = (msg)=>warnings.push(String(msg));
const origLog = console.log;
let logs = [];
console.log = (...a)=>logs.push(a.join(' '));

const auto = require(path.join(__dirname, '../cloud/auto.js'));
const siteRoute = require(path.join(__dirname, '../cloud/siteRoute.js'));
auto.cache();
const ready = new Promise(r=>setImmediate(r));

function loadDev(docs){
	devListener({docChanges: ()=>docs.map(d=>({type: 'added', doc: {id: d.id, data: ()=>Object.assign({}, d)}}))});
}
function call(fn, params, extra){
	return new Promise(res=>{
		let out = {headers: {}, status: 200};
		let response = {
			setHeader: (k, v)=>{ out.headers[k.toLowerCase()] = v; },
			header: (k, v)=>{ out.headers[k.toLowerCase()] = v; },
			status: (s)=>{ out.status = s; return response; },
			send: (b)=>{ out.body = b; res(out); },
			json: (b)=>{ out.body = b; res(out); }
		};
		auto[fn](Object.assign({params, query: {}, headers: {host: 'h.test'}, body: {}}, extra || {}), response);
	});
}
const cloudCode = (txt)=>`{init: function(request, response){ response.send(${JSON.stringify(txt)}) }}`;
function reset(){
	warnings = [];
	logs = [];
	mstore = {};
	siteRoute.resetWarnings();
}

// ---- no site project: nothing is served, and RTDB is never touched ----
test('no site project: cloud is CLOUD_NOT_FOUND (no RTDB lookup)', async ()=>{
	reset();
	let r = await call('cloud', {path: 'nope'});
	assert.strictEqual(r.body, 'No path found.');
	assert.strictEqual(r.headers['x-core-error'], 'CLOUD_NOT_FOUND');
	assert.ok(warnings.includes('CLOUD_NOT_FOUND cloud/nope'));
	assert.ok(!warnings.some(w=>w.startsWith('LEGACY_FALLBACK')));
});

test('no site project: component is 404 COMPONENT_NOT_FOUND (no RTDB lookup)', async ()=>{
	reset();
	let r = await call('component', {path: 'gone.js'});
	assert.strictEqual(r.status, 404);
	assert.strictEqual(r.body, 'Component not found.');
	assert.strictEqual(r.headers['x-core-error'], 'COMPONENT_NOT_FOUND');
});

// ---- with the site project at its fixed home dev/site ----
test('site project: unstarred or non-prod site docs are ignored', async ()=>{
	reset();
	loadDev([{id: 'draft1', projectId: 'site', stage: 'dev', default: false, cloud: {hello: {code: cloudCode('draft')}}}]);
	let r = await call('cloud', {path: 'hello'});
	assert.strictEqual(r.body, 'No path found.');
});

test('site project: cloud resolves to site first', async ()=>{
	reset();
	loadDev([{id: 'site', projectId: 'site', stage: 'prod', default: true,
		cloud: {hello: {code: cloudCode('site hello')}, echo: {code: '{init: (req, res)=>res.send(req.params.id)}'}},
		component: {'site.css': {code: 'h1{}'}, 'manifest.json': {code: '{}'}, 'firebase-sw.js': {code: '//sw'}, 'old_html': {code: '<p>'}}}]);
	let r = await call('cloud', {path: 'hello'}, {headers: {host: 'h.test', origin: 'https://o.test'}});
	assert.strictEqual(r.body, 'site hello');
	assert.strictEqual(r.headers['x-core-source'], 'site');
	assert.strictEqual(r.headers['access-control-allow-origin'], 'https://o.test');
	assert.deepStrictEqual(warnings, []);
	let e = await call('cloud', {path: 'echo', id: 'abc'});
	assert.strictEqual(e.body, 'abc');
});

test('site project: item missing from site is CLOUD_NOT_FOUND', async ()=>{
	reset();
	let r = await call('cloud', {path: 'onlyLegacy'});
	assert.strictEqual(r.body, 'No path found.');
	assert.strictEqual(r.headers['x-core-error'], 'CLOUD_NOT_FOUND');
});

test('site project: site wins over a memory-cache entry', async ()=>{
	reset();
	mstore.hello = cloudCode('stale cache');
	let r = await call('cloud', {path: 'hello'});
	assert.strictEqual(r.body, 'site hello');
});

test('site project: components resolve with correct content types', async ()=>{
	reset();
	let css = await call('component', {path: 'site.css'});
	assert.strictEqual(css.body, 'h1{}');
	assert.strictEqual(css.headers['content-type'], 'text/css');
	let man = await call('component', {path: 'manifest.json'});
	assert.strictEqual(man.headers['content-type'], 'application/json');
	let sw = await call('component', {path: 'firebase-sw.js'});
	assert.strictEqual(sw.headers['content-type'], 'application/javascript');
	assert.strictEqual(sw.headers['x-core-source'], 'site');
	let old = await call('component', {path: 'old.html'});
	assert.strictEqual(old.body, '<p>');
	assert.deepStrictEqual(warnings, []);
});

test('site project: handler error is sent like the project route does', async ()=>{
	reset();
	loadDev([{id: 'site', projectId: 'site', stage: 'prod', default: true, cloud: {bad: {code: '{init: ()=>{ throw new Error("x") }}'}}}]);
	let r = await call('cloud', {path: 'bad'});
	assert.ok(r.body instanceof Error);
});

test('fixed id: dev/site wins over another starred site version', async ()=>{
	reset();
	loadDev([{id: 'site', projectId: 'site', stage: 'prod', default: false, cloud: {hello: {code: cloudCode('site hello')}}},
		{id: 'other', projectId: 'site', stage: 'prod', default: true, cloud: {hello: {code: cloudCode('other hello')}}}]);
	let r = await call('cloud', {path: 'hello'});
	assert.strictEqual(r.body, 'site hello');
	assert.ok(!warnings.some(w=>w.startsWith('FIXED_ID_FALLBACK')));
});

test('fixed id: without dev/{id} the starred version is used with a named warning', ()=>{
	reset();
	let starred = {id: 'r4nd0m', projectId: 'core'};
	let get = (id, vid)=>vid ? undefined : (id == 'core' ? starred : undefined);
	assert.strictEqual(siteRoute.fixed(get, 'core'), starred);
	assert.ok(warnings.includes('FIXED_ID_FALLBACK dev/core'));
	warnings = [];
	assert.strictEqual(siteRoute.fixed(get, 'site'), null);
	assert.deepStrictEqual(warnings, []);
	let fixedDoc = {id: 'core'};
	assert.strictEqual(siteRoute.fixed((id, vid)=>vid == 'core' ? fixedDoc : starred, 'core'), fixedDoc);
	assert.deepStrictEqual(warnings, []);
});

test("'_' cloud handlers are never served (legacy route or project route)", async ()=>{
	reset();
	loadDev([{id: 'site', projectId: 'site', stage: 'prod', default: true,
		cloud: {hello: {code: cloudCode('site hello')}, _boot: {code: cloudCode('boot ran')}}, component: {}}]);
	let r = await call('cloud', {path: '_boot'});
	assert.strictEqual(r.body, 'No path found.');
	assert.strictEqual(r.headers['x-core-error'], 'CLOUD_NOT_FOUND');
	let p = await call('project', {projId: 'site', cloud: '_boot'});
	assert.strictEqual(p.body, 'Cloud not found.');
	let ok = await call('project', {projId: 'site', cloud: 'hello'});
	assert.strictEqual(ok.body, 'site hello');
	assert.strictEqual(siteRoute.find({site: {default: {id: 'site', cloud: {_x: {code: 'c'}}}, snaps: {}}}, 'cloud', '_x'), null);
});

test('startup(): only cloud handlers named _<name>', ()=>{
	assert.deepStrictEqual(siteRoute.startup({cloud: {_a: {code: 'A'}, b: {code: 'B'}, _empty: {code: ''}}}), [{name: '_a', code: 'A'}]);
	assert.deepStrictEqual(siteRoute.startup(null), []);
});

const tick = ()=>new Promise(r=>setTimeout(r, 20));
const bootCode = (tag)=>`{init: ()=>{ (global.__boot = global.__boot || []).push(${JSON.stringify(tag)}) }}`;
test('boot runs dev/site _ handlers only', async ()=>{
	reset(); global.__boot = [];
	siteDoc = {cloud: {_one: {code: bootCode('site one')}, plain: {code: bootCode('plain')}}};
	auto.startup(); await tick();
	assert.deepStrictEqual(global.__boot, ['site one']);
	assert.ok(logs.includes('STARTUP site _one ok'));
});

test('boot with no _ handlers (or a failed read) runs nothing and never reads RTDB', async ()=>{
	for(let doc of [null, {cloud: {plain: {code: bootCode('plain')}}}, new Error('read failed')]){
		reset(); global.__boot = [];
		siteDoc = doc;
		auto.startup(); await tick();
		assert.deepStrictEqual(global.__boot, []);
		assert.ok(!warnings.some(w=>w.startsWith('LEGACY_FALLBACK')));
	}
});

test('warnings are rate-limited per item', ()=>{
	reset();
	assert.strictEqual(siteRoute.warn('LEGACY_FALLBACK', 'cloud', 'x', 1000), true);
	assert.strictEqual(siteRoute.warn('LEGACY_FALLBACK', 'cloud', 'x', 2000), false);
	assert.strictEqual(siteRoute.warn('LEGACY_FALLBACK', 'cloud', 'x', 1000 + 11 * 60 * 1000), true);
});

test('core never calls the Realtime Database', ()=>{
	assert.strictEqual(rtdbCalls, 0);
	const fs = require('fs');
	for(const f of ['cloud/auto.js', 'cloud/fire.js', 'cloud/siteRoute.js', 'cloud/shell.js', 'index.js', 'views/partials/scripts.ejs', 'views/pages/setup.ejs'])
		assert.ok(!/\.database\(|firebase-database|angularfire|databaseURL/i.test(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')), f);
});

(async ()=>{
	await ready;
	let failed = 0;
	for(const t of tests){
		try{
			await t.fn();
			origLog('ok -', t.name);
		}catch(e){
			failed++;
			origLog('NOT OK -', t.name);
			origLog('  ', e && e.stack || e);
		}
	}
	console.warn = origWarn;
	origLog(tests.length - failed + '/' + tests.length, 'passed');
	process.exit(failed ? 1 : 0);
})();
