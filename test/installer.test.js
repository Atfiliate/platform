// Run: node test/installer.test.js
const assert = require('assert');
const installer = require('../cloud/installer.js');

const tests = [];
const test = (name, fn)=>tests.push({name, fn});

// Small Firestore-like mock: docs by path, where() on equality, create() fails if present, createTime/updateTime.
function mockDb(initial){
	let store = {}, times = {}, seq = 0, auto = 0;
	let put = (p, d, created)=>{ store[p] = JSON.parse(JSON.stringify(d)); let t = ++seq; times[p] = {c: created ? t : (times[p] ? times[p].c : t), u: t}; };
	Object.entries(initial || {}).forEach(([p, d])=>put(p, d, true));
	let ts = n=>({n, isEqual: o=>o && o.n === n});
	let snap = p=>({exists: p in store, id: p.split('/').pop(), ref: doc(p), data: ()=>store[p] && JSON.parse(JSON.stringify(store[p])),
		createTime: times[p] && ts(times[p].c), updateTime: times[p] && ts(times[p].u)});
	function doc(p){
		return {id: p.split('/').pop(), path: p,
			get: async ()=>snap(p),
			create: async d=>{ if(p in store){ let e = new Error('already exists'); e.code = 6; throw e; } put(p, d, true); },
			set: async (d, o)=>put(p, o && o.merge ? Object.assign({}, store[p], d) : d, !(p in store)),
			delete: async ()=>{ delete store[p]; delete times[p]; }};
	}
	function collection(c){
		let filters = [], lim = Infinity;
		let q = {
			where: (f, op, v)=>{ filters.push([f, v]); return q; },
			limit: n=>{ lim = n; return q; },
			doc: id=>doc(`${c}/${id || ('auto' + (++auto))}`),
			get: async ()=>({docs: Object.keys(store).filter(p=>p.startsWith(c + '/') && p.split('/').length == c.split('/').length + 1)
				.filter(p=>filters.every(([f, v])=>store[p][f] === v)).slice(0, lim).map(snap)})
		};
		return q;
	}
	return {doc, collection, _store: store};
}
const env = {config: JSON.stringify({title: 'Test Site', firebase: {projectId: 'p'}}), googleJson: '{}', origin: 'https://example.test/', systemEmail: 'x@example.test'};
const auth = ()=>({verifyIdToken: async t=>{ if(t == 'root') return {uid: 'u-root'}; if(t == 'new') return {uid: 'u-new'}; throw new Error('bad'); }});

test('dry run on an empty site: plans every create, writes nothing', async ()=>{
	let db = mockDb();
	let i = installer.create({db, auth, env});
	let r = await i.apply({uid: 'u-new'});
	assert.strictEqual(r.dryRun, true);
	assert.strictEqual(r.writes, 0);
	assert.deepStrictEqual(r.wouldCreate.slice(0, 3), ['admin/settings', 'roles/u-new', 'acl/db/groups/manage']);
	assert.ok(r.wouldCreate[3].startsWith('dev/'));
	assert.strictEqual(Object.keys(db._store).length, 0);
});

test('apply needs confirm, then creates, logs, and is idempotent', async ()=>{
	let db = mockDb();
	let i = installer.create({db, auth, env});
	let notConfirmed = await i.apply({uid: 'u-new', dryRun: false});
	assert.strictEqual(notConfirmed.dryRun, true);
	let r = await i.apply({uid: 'u-new', dryRun: false, confirm: 'apply'});
	assert.strictEqual(r.dryRun, false);
	assert.strictEqual(r.writes, 4);
	assert.strictEqual(db._store['admin/settings'].domain, 'https://example.test');
	assert.strictEqual(db._store['roles/u-new'].root, true);
	let site = Object.keys(db._store).find(p=>p.startsWith('dev/'));
	let sd = db._store[site];
	assert.strictEqual(sd.projectId, 'site');
	assert.strictEqual(sd.default, true);
	assert.ok(sd.cloud.pixel.code.includes('process.env.pixabayKey'));
	assert.strictEqual(JSON.parse(sd.component['manifest.json'].code).name, 'Test Site');
	assert.ok(db._store[`admin/install/log/${r.logId}`].created.length == 4);
	let again = await i.apply({uid: 'u-new', dryRun: false, confirm: 'apply'});
	assert.strictEqual(again.writes, 0);
	assert.ok(again.steps.every(s=>s.action != 'create'));
});

test('never overwrites an existing site project; reports drift', async ()=>{
	let db = mockDb({'dev/s1': {projectId: 'site', stage: 'prod', default: true, cloud: {pixel: {code: 'old'}}, component: {}}, 'roles/u-root': {root: true}});
	let i = installer.create({db, auth, env});
	let r = await i.apply({uid: 'u-root', dryRun: false, confirm: 'apply'});
	let sp = r.steps.find(s=>s.id == 'siteProject');
	assert.strictEqual(sp.action, 'none');
	assert.ok(sp.differs.includes('cloud.pixel'));
	assert.strictEqual(db._store['dev/s1'].cloud.pixel.code, 'old');
});

test('stops before any write when required env is missing', async ()=>{
	let db = mockDb();
	let i = installer.create({db, auth, env: Object.assign({}, env, {origin: ''})});
	await assert.rejects(i.apply({uid: 'u-new', dryRun: false, confirm: 'apply'}), e=>e.error.code == 'ENV_INCOMPLETE');
	assert.strictEqual(Object.keys(db._store).length, 0);
});

test('rollback deletes only unchanged docs created by that log', async ()=>{
	let db = mockDb();
	let i = installer.create({db, auth, env});
	let r = await i.apply({uid: 'u-new', dryRun: false, confirm: 'apply'});
	await db.doc('admin/settings').set({domain: 'changed'}, {merge: true});
	let dry = await i.rollback({logId: r.logId});
	assert.strictEqual(dry.dryRun, true);
	let done = await i.rollback({logId: r.logId, dryRun: false, confirm: 'rollback'});
	assert.strictEqual(done.dryRun, false);
	assert.ok(db._store['admin/settings']);
	assert.ok(!db._store['roles/u-new']);
	assert.ok(!Object.keys(db._store).some(p=>p.startsWith('dev/')));
});

test('auth: 401 without/invalid token, 403 non-root, install key only while roles is empty', async ()=>{
	let db = mockDb({'roles/u-root': {root: true}});
	let i = installer.create({db, auth, env: Object.assign({}, env, {installKey: 'k1'})});
	let req = (a, k)=>({headers: Object.assign({}, a ? {authorization: 'Bearer ' + a} : {}, k ? {'x-install-key': k} : {})});
	await assert.rejects(i.authorize(req()), e=>e.status == 401);
	await assert.rejects(i.authorize(req('bad')), e=>e.status == 401);
	await assert.rejects(i.authorize(req('new', 'k1')), e=>e.status == 403);	// roles not empty
	assert.strictEqual((await i.authorize(req('root'))).uid, 'u-root');
	let empty = installer.create({db: mockDb(), auth, env: Object.assign({}, env, {installKey: 'k1'})});
	await assert.rejects(empty.authorize(req('new', 'wrong')), e=>e.status == 403);
	assert.strictEqual((await empty.authorize(req('new', 'k1'))).uid, 'u-new');
	let noKey = installer.create({db: mockDb(), auth, env});
	await assert.rejects(noKey.authorize(req('new', 'k1')), e=>e.status == 403);
});

test('site package files are generic and carry no key values', async ()=>{
	let i = installer.create({db: mockDb(), auth, env});
	let {files} = i.sitePackage();
	let all = JSON.stringify(files);
	assert.ok(!/key:\s*['"][A-Za-z0-9]{10,}/.test(all));
	assert.ok(files.component['firebase-sw.js'].includes('/cloud/swConfig'));
});

(async ()=>{
	let pass = 0;
	for(const t of tests){
		try{ await t.fn(); pass++; console.log('ok - ' + t.name); }
		catch(e){ console.log('NOT OK - ' + t.name); console.log('  ', e && e.stack || e); }
	}
	console.log(`${pass}/${tests.length} passed`);
	process.exit(pass == tests.length ? 0 : 1);
})();
