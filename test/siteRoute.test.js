// Run: node test/siteRoute.test.js
// Loads cloud/auto.js with stubbed dependencies (no network, no Firebase).
const assert = require('assert');
const Module = require('module');
const path = require('path');

const tests = [];
const test = (name, fn)=>tests.push({name, fn});

// ---- stubs ----
let rtdb = {endpoints: {}, components: {}};
let devListener = null;
let mstore = {};
const stubs = {
	'firebase-admin': {
		apps: [{}],
		firestore: ()=>({
			collection: (p)=>({
				onSnapshot: (cb)=>{ if(p == 'dev') devListener = cb; return ()=>{}; },
				doc: ()=>({})
			}),
			// admin/settings: the legacy cloud route reads $settings.subSite[host]
			doc: (p)=>({get: ()=>Promise.resolve({id: p.split('/').pop(), ref: {}, exists: true, data: ()=>({subSite: {}})})})
		}),
		database: ()=>({
			ref: (p)=>({
				child: (name)=>({
					once: (ev, cb)=>{
						let cat = p.split('/').pop();
						let val = rtdb[cat][name];
						setImmediate(()=>cb({val: ()=>val === undefined ? null : val, exists: ()=>val !== undefined}));
					}
				}),
				once: ()=>{}
			})
		}),
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
console.log = ()=>{};

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
	mstore = {};
	siteRoute.resetWarnings();
}

// ---- legacy only (no site project): must behave as before ----
test('no site project: cloud falls back to RTDB endpoint', async ()=>{
	reset();
	rtdb.endpoints.hello = {code: cloudCode('legacy hello')};
	let r = await call('cloud', {path: 'hello'});
	assert.strictEqual(r.body, 'legacy hello');
	assert.strictEqual(r.headers['x-core-source'], undefined);
	assert.ok(warnings.includes('LEGACY_FALLBACK cloud/hello'));
});

test('no site project: missing cloud keeps legacy body, adds named error header', async ()=>{
	reset();
	let r = await call('cloud', {path: 'nope'});
	assert.strictEqual(r.body, 'No path found.');
	assert.strictEqual(r.headers['x-core-error'], 'CLOUD_NOT_FOUND');
	assert.ok(warnings.includes('CLOUD_NOT_FOUND cloud/nope'));
});

test('no site project: component falls back with legacy name_ext and content type', async ()=>{
	reset();
	rtdb.components['site_css'] = {code: 'body{}'};
	let r = await call('component', {path: 'site.css'});
	assert.strictEqual(r.body, 'body{}');
	assert.strictEqual(r.headers['content-type'], 'text/css');
	assert.ok(warnings.includes('LEGACY_FALLBACK component/site_css'));
});

test('no site project: missing component keeps legacy body, adds named error header', async ()=>{
	reset();
	let r = await call('component', {path: 'gone.js'});
	assert.ok(r.body instanceof Error);
	assert.strictEqual(r.headers['x-core-error'], 'COMPONENT_NOT_FOUND');
});

// ---- with a starred site project ----
test('site project: unstarred or non-prod site docs are ignored', async ()=>{
	reset();
	loadDev([{id: 'draft1', projectId: 'site', stage: 'dev', default: false, cloud: {hello: {code: cloudCode('draft')}}}]);
	let r = await call('cloud', {path: 'hello'});
	assert.strictEqual(r.body, 'legacy hello');
});

test('site project: cloud resolves to site first', async ()=>{
	reset();
	loadDev([{id: 'v1', projectId: 'site', stage: 'prod', default: true,
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

test('site project: item missing from site falls back to RTDB with a named warning', async ()=>{
	reset();
	rtdb.endpoints.onlyLegacy = {code: cloudCode('legacy only')};
	let r = await call('cloud', {path: 'onlyLegacy'});
	assert.strictEqual(r.body, 'legacy only');
	assert.ok(warnings.includes('LEGACY_FALLBACK cloud/onlyLegacy'));
});

test('site project: site wins over a cached legacy copy', async ()=>{
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
	loadDev([{id: 'v1', projectId: 'site', stage: 'prod', default: true, cloud: {bad: {code: '{init: ()=>{ throw new Error("x") }}'}}}]);
	let r = await call('cloud', {path: 'bad'});
	assert.ok(r.body instanceof Error);
});

test('warnings are rate-limited per item', ()=>{
	reset();
	assert.strictEqual(siteRoute.warn('LEGACY_FALLBACK', 'cloud', 'x', 1000), true);
	assert.strictEqual(siteRoute.warn('LEGACY_FALLBACK', 'cloud', 'x', 2000), false);
	assert.strictEqual(siteRoute.warn('LEGACY_FALLBACK', 'cloud', 'x', 1000 + 11 * 60 * 1000), true);
});

test('client sends the ID token to cl_img', ()=>{
	const fs = require('fs');
	const src = fs.readFileSync(path.join(__dirname, '../public/js/services.js'), 'utf8');
	assert.ok(/getIdToken\(\)\.then\(jwt=>\{\s*return \$http\.post\('\/cloud\/cl_img', \{imgUrl\}, \{headers: \{Authorization: 'Bearer '\+jwt\}\}\)/.test(src));
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
