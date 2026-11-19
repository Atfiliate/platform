// Run: node test/siteRoute.test.js
// Loads cloud/auto.js with stubbed dependencies (no network, no Firebase).
const assert = require('assert');
const Module = require('module');
const path = require('path');

const tests = [];
const test = (name, fn)=>tests.push({name, fn});

// ---- stubs ----
let siteDoc = null; // what dev/site returns to auto.startup()
let devListener = null;
let mstore = {};
const tokens = {devTok: 'dev1', userTok: 'user1', rootTok: 'root1'};
const roleDocs = {dev1: {developer: {groups: true}}, user1: {admin: {all: false}}, root1: {root: true}};
const fake = {
		apps: [{}],
		firestore: ()=>({
			collection: (p)=>({
				onSnapshot: (cb)=>{ if(p == 'dev') devListener = cb; return ()=>{}; },
				doc: (id)=>({get: ()=>{
					if(p == 'roles') return Promise.resolve({id, exists: !!roleDocs[id], data: ()=>roleDocs[id]});
					return siteDoc instanceof Error ? Promise.reject(siteDoc) : Promise.resolve({id, exists: !!siteDoc, data: ()=>siteDoc});
				}})
			}),
			// admin/settings without subSite (as on sites that never set one): cloud() must not throw
			doc: (p)=>({get: ()=>Promise.resolve({id: p.split('/').pop(), ref: {}, exists: true, data: ()=>({})})})
		}),
			auth: ()=>({verifyIdToken: (t)=>tokens[t] ? Promise.resolve({uid: tokens[t]}) : Promise.reject(new Error('bad token'))})
};
const stubs = {
	// Only the modular API exists (firebase-admin 14); loading the namespace entry point is a test failure.
	'firebase-admin': new Proxy({}, {get: (t, k)=>{ throw new Error('firebase-admin namespace used: ' + String(k)); }}),
	'firebase-admin/app': {getApps: ()=>fake.apps, getApp: ()=>({}), initializeApp: ()=>{}, cert: ()=>({})},
	'firebase-admin/firestore': {getFirestore: ()=>fake.firestore(), FieldValue: {delete: ()=>({$delete: true}), increment: n=>({$increment: n})}, FieldPath: {documentId: ()=>'__name__'}, Timestamp: {}, GeoPoint: function(){}},
	'firebase-admin/auth': {getAuth: ()=>fake.auth ? fake.auth() : {}},
	'firebase-admin/storage': {getStorage: ()=>({})},
	'firebase-admin/messaging': {getMessaging: ()=>({})},
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
test('admin/settings without subSite: unknown host still gets a named CLOUD_NOT_FOUND', async ()=>{
	reset();
	await ready;
	let r = await call('cloud', {path: 'nope'}, {headers: {host: 'unlisted.test'}});
	assert.strictEqual(r.headers['x-core-error'], 'CLOUD_NOT_FOUND');
	assert.strictEqual(r.body, 'No path found.');
});
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
	let exact = await call('component', {path: 'old_html'});
	assert.strictEqual(exact.body, '<p>');
	assert.strictEqual(exact.headers['content-type'], undefined);
	let mapped = await call('component', {path: 'old.html'});
	assert.strictEqual(mapped.status, 404, 'no name_ext mapping: old.html is not old_html');
	warnings = [];
});

test('site project: a handler that throws gets a generic 500 (no error details sent)', async ()=>{
	reset();
	loadDev([{id: 'site', projectId: 'site', stage: 'prod', default: true, cloud: {bad: {code: '{init: ()=>{ throw new Error("secret detail") }}'}}}]);
	let r = await call('cloud', {path: 'bad'});
	assert.strictEqual(r.status, 500);
	assert.deepStrictEqual(r.body, {error: 'Cloud handler failed'});
	let p = await call('project', {projId: 'site', cloud: 'bad'});
	assert.strictEqual(p.status, 500);
	assert.ok(!JSON.stringify(p.body).includes('secret detail'));
});

// ---- ?v= versions on /project/:projId/cloud/:cloud ----
const verDocs = ()=>[
	{id: 'gStar', projectId: 'groups', stage: 'prod', default: true, cloud: {hi: {code: cloudCode('starred')}}},
	{id: 'gProd', projectId: 'groups', stage: 'prod', default: false, cloud: {hi: {code: cloudCode('published')}, _comm: {code: cloudCode('comm')}}},
	{id: 'gDev', projectId: 'groups', stage: 'dev', default: false, cloud: {hi: {code: cloudCode('draft')}}}
];
const vcall = (v, extra)=>call('project', {projId: 'groups', cloud: 'hi'}, Object.assign({query: v ? {v} : {}}, extra || {}));
test('?v=: starred and published (stage prod) versions run for anyone', async ()=>{
	reset(); loadDev(verDocs());
	assert.strictEqual((await vcall()).body, 'starred');
	assert.strictEqual((await vcall('gStar')).body, 'starred');
	assert.strictEqual((await vcall('gProd')).body, 'published');
	// server-to-server calls such as /project/groups/cloud/_comm?v=<published id> keep working
	let c = await call('project', {projId: 'groups', cloud: '_comm'}, {query: {v: 'gProd'}});
	assert.strictEqual(c.body, 'comm');
});
test('?v=: an unpublished (dev) version needs a developer of that project', async ()=>{
	reset(); loadDev(verDocs());
	let anon = await vcall('gDev');
	assert.strictEqual(anon.status, 401);
	assert.strictEqual(anon.body.errors[0].code, 'DEVELOPER_REQUIRED');
	let bad = await vcall('gDev', {headers: {host: 'h.test', authorization: 'Bearer nope'}});
	assert.strictEqual(bad.status, 401);
	assert.strictEqual(bad.body.errors[0].code, 'AUTH_INVALID');
	let user = await vcall('gDev', {headers: {host: 'h.test', authorization: 'Bearer userTok'}});
	assert.strictEqual(user.status, 403);
	assert.strictEqual(user.body.errors[0].code, 'FORBIDDEN');
	let dev = await vcall('gDev', {headers: {host: 'h.test', authorization: 'Bearer devTok'}});
	assert.strictEqual(dev.body, 'draft');
	let root = await vcall('gDev', {body: {jwt: 'rootTok'}});
	assert.strictEqual(root.body, 'draft');
	assert.ok(!JSON.stringify(anon.body).includes('draft'));
});
test('?v=: an unknown version id is not found', async ()=>{
	reset(); loadDev(verDocs());
	assert.strictEqual((await vcall('nope')).body, 'Cloud not found.');
});

test('fixed id: dev/site wins over another starred site version', async ()=>{
	reset();
	loadDev([{id: 'site', projectId: 'site', stage: 'prod', default: false, cloud: {hello: {code: cloudCode('site hello')}}},
		{id: 'other', projectId: 'site', stage: 'prod', default: true, cloud: {hello: {code: cloudCode('other hello')}}}]);
	let r = await call('cloud', {path: 'hello'});
	assert.strictEqual(r.body, 'site hello');
});

test('fixed id: without dev/site nothing is served (no starred-version fallback)', async ()=>{
	reset();
	loadDev([{id: 'site', projectId: 'site', stage: 'prod', default: false, cloud: {}, component: {}},
		{id: 'other', projectId: 'site', stage: 'prod', default: true, cloud: {hello: {code: cloudCode('other hello')}}}]);
	assert.strictEqual(siteRoute.siteProject({site: {default: {id: 'other'}, snaps: {other: {id: 'other'}}}}), null);
	let r = await call('cloud', {path: 'hello'});
	assert.strictEqual(r.body, 'No path found.');
	assert.ok(!warnings.some(w=>w.startsWith('FIXED_ID_FALLBACK')));
});

test("'__' cloud handlers are never served: 404 STARTUP_NOT_SERVED on the legacy route and on every project", async ()=>{
	reset();
	loadDev([
		{id: 'site', projectId: 'site', stage: 'prod', default: true,
			cloud: {hello: {code: cloudCode('site hello')}, __boot: {code: cloudCode('boot ran')}}, component: {}},
		{id: 'g1', projectId: 'groups', stage: 'prod', default: true,
			cloud: {__job: {code: cloudCode('job ran')}, _comm: {code: cloudCode('comm ran')}}},
	]);
	let r = await call('cloud', {path: '__boot'});
	assert.strictEqual(r.status, 404);
	assert.strictEqual(r.headers['x-core-error'], 'STARTUP_NOT_SERVED');
	assert.notStrictEqual(r.body, 'boot ran');
	for(let [projId, cloud] of [['site', '__boot'], ['groups', '__job'], ['nothere', '__x']]){
		let p = await call('project', {projId, cloud});
		assert.strictEqual(p.status, 404, projId);
		assert.strictEqual(p.headers['x-core-error'], 'STARTUP_NOT_SERVED', projId);
	}
	let pv = await call('project', {projId: 'groups', cloud: '__job'}, {query: {v: 'g1'}});
	assert.strictEqual(pv.status, 404);
	let ok = await call('project', {projId: 'site', cloud: 'hello'});
	assert.strictEqual(ok.body, 'site hello');
	assert.strictEqual(siteRoute.find({site: {default: {id: 'site', cloud: {__x: {code: 'c'}}}, snaps: {}}}, 'cloud', '__x'), null);
});

test("single '_' cloud handlers are normal endpoints (site and other projects)", async ()=>{
	reset();
	loadDev([
		{id: 'site', projectId: 'site', stage: 'prod', default: true, cloud: {_queue: {code: cloudCode('site queue')}}, component: {}},
		{id: 'g1', projectId: 'groups', stage: 'prod', default: true, cloud: {_comm: {code: cloudCode('comm ran')}}},
	]);
	assert.strictEqual((await call('cloud', {path: '_queue'})).body, 'site queue');
	assert.strictEqual((await call('project', {projId: 'site', cloud: '_queue'})).body, 'site queue');
	assert.strictEqual((await call('project', {projId: 'groups', cloud: '_comm'})).body, 'comm ran');
	assert.strictEqual(siteRoute.isStartup('_x'), false);
	assert.strictEqual(siteRoute.isStartup('__'), false);
	assert.strictEqual(siteRoute.isStartup('__x'), true);
});

test('startup(): only cloud handlers named __<name>', ()=>{
	assert.deepStrictEqual(siteRoute.startup({cloud: {__a: {code: 'A'}, _b: {code: 'B'}, c: {code: 'C'}, __empty: {code: ''}}}), [{name: '__a', code: 'A'}]);
	assert.deepStrictEqual(siteRoute.startup(null), []);
});

const tick = ()=>new Promise(r=>setTimeout(r, 20));
const bootCode = (tag)=>`{init: ()=>{ (global.__boot = global.__boot || []).push(${JSON.stringify(tag)}) }}`;
test('boot runs dev/site __ handlers only (not single _ handlers)', async ()=>{
	reset(); global.__boot = [];
	siteDoc = {cloud: {__one: {code: bootCode('site one')}, _single: {code: bootCode('single')}, plain: {code: bootCode('plain')}}};
	auto.startup(); await tick();
	assert.deepStrictEqual(global.__boot, ['site one']);
	assert.ok(logs.includes('STARTUP site __one ok'));
});

test('boot with no __ handlers (or a failed read) runs nothing and never reads RTDB', async ()=>{
	for(let doc of [null, {cloud: {plain: {code: bootCode('plain')}, _single: {code: bootCode('single')}}}, new Error('read failed')]){
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

test('core never calls the Realtime Database, the firebase-admin namespace or the request library', ()=>{
	const fs = require('fs');
	for(const f of ['cloud/auto.js', 'cloud/fire.js', 'cloud/siteRoute.js', 'cloud/shell.js', 'index.js', 'views/partials/scripts.ejs', 'views/pages/setup.ejs'])
		assert.ok(!/\.database\(|firebase-database|angularfire|databaseURL/i.test(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')), f);
	const code = ['cloud/auto.js', 'cloud/fire.js', 'cloud/aiMeter.js', 'cloud/health.js', 'index.js', 'install/apply.js']
		.concat(fs.readdirSync(path.join(__dirname, '../install/site/cloud')).map(f=>'install/site/cloud/' + f));
	for(const f of code){
		let src = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
		assert.ok(!/require\(\s*['"]firebase-admin['"]\s*\)/.test(src), f + ' loads the firebase-admin namespace');
		assert.ok(!/require\(\s*['"]request(-promise)?['"]\s*\)/.test(src), f + ' loads the request library');
		assert.ok(!/(?<![\w.])firebase\.(firestore|auth|messaging|storage|apps|app|initializeApp|credential)\b/.test(src), f + ' uses firebase.* namespace calls');
	}
	const pkg = require('../package.json');
	for(const dep of ['request', 'request-promise']) assert.ok(!pkg.dependencies[dep], dep + ' is still a dependency');
	assert.ok(/^14\./.test(pkg.dependencies['firebase-admin']));
});

// ---- id validation: reserved or malformed ids never reach the cache or Firestore ----
test('?v= with a reserved or malformed id: 404 VERSION_NOT_FOUND without a Firestore read', async ()=>{
	reset();
	await ready;
	let saved = siteDoc;
	siteDoc = new Error('Firestore must not be read'); // a read would turn into a 500
	try{
		for(const v of ['__no_such_version__', '__name__', 'a.b', 'a/b', 'x y', '', 'z'.repeat(129)].filter(Boolean)){
			for(const params of [{projId: 'groups'}, {projId: 'groups', cloud: 'hi'}, {projId: 'groups', component: 'x.js'}]){
				let r = await call('project', params, {query: {v}});
				assert.strictEqual(r.status, 404, `${JSON.stringify(params)} v=${v.slice(0, 20)}`);
				assert.strictEqual(r.headers['x-core-error'], 'VERSION_NOT_FOUND');
			}
		}
		let r = await call('project', {projId: 'groups'}, {query: {v: ['a', 'b']}});
		assert.strictEqual(r.status, 404);
		assert.strictEqual(r.headers['x-core-error'], 'VERSION_NOT_FOUND');
	}finally{ siteDoc = saved; }
});

test('malformed or reserved project id: 404 PROJECT_NOT_FOUND', async ()=>{
	reset();
	await ready;
	for(const projId of ['__x__', 'a.b', 'a b', 'groups.snaps']){
		let r = await call('project', {projId});
		assert.strictEqual(r.status, 404, projId);
		assert.strictEqual(r.headers['x-core-error'], 'PROJECT_NOT_FOUND');
	}
	assert.strictEqual(auto.getProject('__x__'), null);
	assert.strictEqual(auto.getProject('groups', 'a.b'), null);
});

test('Firestore INVALID_ARGUMENT on a version read maps to 404 VERSION_NOT_FOUND', async ()=>{
	reset();
	await ready;
	let saved = siteDoc;
	siteDoc = Object.assign(new Error('3 INVALID_ARGUMENT: Document name is invalid'), {code: 3});
	try{
		let r = await call('project', {projId: 'groups'}, {query: {v: 'wellFormedButUnknown'}});
		assert.strictEqual(r.status, 404);
		assert.strictEqual(r.headers['x-core-error'], 'VERSION_NOT_FOUND');
		siteDoc = new Error('network down');
		r = await call('project', {projId: 'groups'}, {query: {v: 'wellFormedButUnknown2'}});
		assert.strictEqual(r.status, 500); // other read errors stay 500
	}finally{ siteDoc = saved; }
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
