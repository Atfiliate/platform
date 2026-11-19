// Run: node test/health.test.js
const assert = require('assert');
const health = require('../cloud/health.js');

const tests = [];
const test = (name, fn)=>tests.push({name, fn});

// Minimal Fire mock: docs = {path: data}, collections = {path: [docs]}
function mockFire(store){
	return function(path){
		let fire = this;
		let parts = path.split('/');
		let isDoc = parts.length % 2 == 0;
		fire.where = ()=>fire;
		fire.limit = ()=>fire;
		fire.get = ()=>{
			if(isDoc){
				let data = store[path];
				let d = Object.assign({}, data || {});
				d.id = parts[parts.length-1];
				d.$fire = {ds: {exists: !!data}};
				return Promise.resolve(d);
			}
			return Promise.resolve(store[path] || []);
		};
	};
}
const fullEnv = {
	config: JSON.stringify({firebase: {projectId: 'p', apiKey: 'k', authDomain: 'a'}}),
	googleJson: '{}', origin: 'https://example.test', systemEmail: 'x@example.test'
};
const fullStore = {
	'admin/settings': {domain: 'example.test', subSite: 'x'},
	'roles': [{id: 'u1'}],
	'roles/u1': {root: true},
	'roles/u2': {admin: {all: false}},
	'acl/db/groups/manage': {name: 'manage'},
	'acl/db/groups/manage/data/role/comm/comm/templates': [{id: 't1'}],
	'dev': [{id: 'v1'}]
};
const auth = ()=>({verifyIdToken: t=>t == 'good1' ? Promise.resolve({uid: 'u1'}) : t == 'good2' ? Promise.resolve({uid: 'u2'}) : Promise.reject(new Error('bad'))});

test('ok when env and data are complete', async ()=>{
	let h = health.create({Fire: mockFire(fullStore), auth, env: fullEnv});
	let r = await h.health();
	assert.strictEqual(r.status, 'ok', JSON.stringify(r.errors));
	assert.deepStrictEqual(r.errors, []);
});

test('named errors for missing env, never values', async ()=>{
	let env = Object.assign({}, fullEnv, {origin: '', config: JSON.stringify({firebase: {projectId: 'secretish'}})});
	delete env.systemEmail;
	let h = health.create({Fire: mockFire(fullStore), auth, env});
	let r = await h.health();
	let names = r.errors.map(e=>e.name);
	assert.ok(names.includes('origin'));
	assert.ok(names.includes('systemEmail'));
	assert.ok(names.includes('config.firebase.authDomain'));
	assert.ok(!JSON.stringify(r).includes('secretish'));
	assert.ok(!JSON.stringify(r).includes('example.test'));
});

test('settings mode: systemEmail is not env; settings, studio, sites and config problems are listed by name', async ()=>{
	let env = Object.assign({}, fullEnv); delete env.systemEmail;
	let mk = (code, name)=>({code, name, message: 'm'});
	let siteConfig = {mode: ()=>'settings', problems: ()=>({errors: [mk('SETTING_MISSING', 'systemEmail')], warnings: [mk('CONFIG_ENV_UNUSED', 'config.title')]})};
	let studio = {isReady: ()=>true, problems: ()=>[mk('SETTING_INVALID', 'tutorMaxOut')]};
	let sites = {problems: ()=>[mk('SITE_OVERRIDE_INVALID', 'a.example.title')]};
	let settings = {isReady: ()=>true, problems: ()=>[]};
	let r = await health.create({Fire: mockFire(fullStore), auth, env, settings, studio, sites, siteConfig}).health();
	assert.strictEqual(r.configSource, 'settings');
	let errs = r.errors.map(e=>e.code + ' ' + e.name), warns = r.warnings.map(e=>e.code + ' ' + e.name);
	assert.ok(!errs.includes('MISSING_ENV systemEmail'));
	assert.ok(errs.includes('SETTING_MISSING systemEmail') && errs.includes('SETTING_INVALID studio.tutorMaxOut'));
	assert.ok(warns.includes('CONFIG_ENV_UNUSED config.title') && warns.includes('SITE_OVERRIDE_INVALID sites.a.example.title'));
	// env mode still needs systemEmail in env
	let r2 = await health.create({Fire: mockFire(fullStore), auth, env, siteConfig: {mode: ()=>'env', problems: ()=>({errors: [], warnings: []})}}).health();
	assert.ok(r2.errors.some(e=>e.name == 'systemEmail'));
});

test('missing docs and empty collections are named', async ()=>{
	let store = Object.assign({}, fullStore);
	delete store['admin/settings'];
	delete store['acl/db/groups/manage/data/role/comm/comm/templates'];
	let h = health.create({Fire: mockFire(store), auth, env: fullEnv});
	let r = await h.health();
	assert.ok(r.errors.some(e=>e.code == 'MISSING_DOC' && e.name == 'admin/settings'));
	assert.ok(r.errors.some(e=>e.code == 'EMPTY_COLLECTION'));
});

test('plan is dry run and reports wouldCreate/manual', async ()=>{
	let store = Object.assign({}, fullStore);
	delete store['admin/settings'];
	let h = health.create({Fire: mockFire(store), auth, env: Object.assign({}, fullEnv, {origin: ''})});
	let p = await h.plan();
	assert.strictEqual(p.dryRun, true);
	assert.strictEqual(p.writes, 0);
	let by = {};
	p.steps.forEach(s=>by[s.id] = s.action);
	assert.strictEqual(by.settings, 'wouldCreate');
	assert.strictEqual(by.env, 'manual');
	assert.strictEqual(by.roles, 'none');
	assert.strictEqual(by.siteProject, 'wouldCreate');
	assert.strictEqual(by.products, 'planned');
});

function call(h, fn, authorization){
	return new Promise(res=>{
		let out = {status: 200, headers: {}};
		let response = {
			setHeader: (k, v)=>out.headers[k] = v,
			status: s=>{ out.status = s; return response; },
			json: b=>{ out.body = b; res(out); }
		};
		h.route(fn)({headers: authorization ? {authorization} : {}}, response);
	});
}

test('route: 401 without token, 401 bad token, 403 non-root, 200 root', async ()=>{
	let h = health.create({Fire: mockFire(fullStore), auth, env: fullEnv});
	assert.strictEqual((await call(h, 'health')).status, 401);
	assert.strictEqual((await call(h, 'health', 'Bearer bad')).status, 401);
	let f = await call(h, 'health', 'Bearer good2');
	assert.strictEqual(f.status, 403);
	assert.strictEqual(f.body.errors[0].code, 'FORBIDDEN');
	let ok = await call(h, 'plan', 'Bearer good1');
	assert.strictEqual(ok.status, 200);
	assert.strictEqual(ok.body.dryRun, true);
	assert.strictEqual(ok.headers['Cache-Control'], 'no-store');
});

test('Fire throwing synchronously becomes CHECK_FAILED', async ()=>{
	let Fire = function(){ throw new Error('no db'); };
	let h = health.create({Fire, auth, env: fullEnv});
	let r = await h.health();
	assert.strictEqual(r.status, 'error');
	assert.ok(r.errors.every(e=>e.code == 'CHECK_FAILED'));
});

(async ()=>{
	let failed = 0;
	for(const t of tests){
		try{
			await t.fn();
			console.log('ok -', t.name);
		}catch(e){
			failed++;
			console.log('NOT OK -', t.name);
			console.log('  ', e && e.stack || e);
		}
	}
	console.log(tests.length - failed + '/' + tests.length, 'passed');
	process.exit(failed ? 1 : 0);
})();
