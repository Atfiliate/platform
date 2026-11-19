// Run: node test/install.test.js
const assert = require('assert');
const installer = require('../install/installer.js');

function memStore(init){
	let data = JSON.parse(JSON.stringify(init || {}));
	let get = (p)=>p.split('.').reduce((o, k)=>o && o[k], null);
	return {
		data,
		get: async p=>data[p] ? JSON.parse(JSON.stringify(data[p])) : null,
		set: async (p, v, o)=>{ data[p] = (o && o.merge && data[p]) ? Object.assign({}, data[p], v) : v; },
		query: async (col, wheres)=>Object.keys(data).filter(k=>k.startsWith(col + '/') && k.split('/').length == 2)
			.map(k=>({id: k.split('/')[1], data: data[k]}))
			.filter(d=>(wheres || []).every(([f, op, v])=>f.split('.').reduce((o, x)=>o && o[x], d.data) === v))
	};
}
const goodEnv = {
	config: JSON.stringify({firebase: {projectId: 'p', apiKey: 'k', authDomain: 'p.example'}}),
	googleJson: JSON.stringify({project_id: 'p', client_email: 'e', private_key: 'x'}),
	origin: 'https://site.example/', systemEmail: 'noreply@site.example'
};
const adminHtml = '<md-sidenav>\n\t\t\t<md-list>\n\t\t\t\t<md-list-item>Tools</md-list-item>\n\t\t\t</md-list>\n</md-sidenav>';

(async ()=>{
	// env: named errors for every missing name, values never echoed
	let e = installer.checkEnv({config: '{bad', origin: 'x'});
	assert.deepStrictEqual(e.errors.map(x=>x.code + ':' + x.name).sort(), ['INVALID_ENV:config', 'MISSING_ENV:googleJson', 'MISSING_ENV:systemEmail']);
	assert.ok(e.warnings.some(w=>w.name == 'pixabayKey' && /image search/i.test(w.message)));
	let e2 = installer.checkEnv(Object.assign({}, goodEnv, {googleJson: '{"project_id":"p"}'}));
	assert.deepStrictEqual(e2.errors.map(x=>x.name).sort(), ['googleJson.client_email', 'googleJson.private_key']);
	assert.ok(!JSON.stringify(installer.checkEnv(goodEnv)).includes('noreply@'));

	// blocked env: nothing is written even with apply
	let s0 = memStore();
	let r0 = await installer.run({env: {}, store: s0, apply: true});
	assert.strictEqual(r0.applied, false);
	assert.deepStrictEqual(s0.data, {});

	// new project: dry run plans, apply creates settings, root, dev/site, Site Code entry, install log
	let s = memStore({'dev/adm1': {projectId: 'admin', stage: 'prod', default: true, page: {html: adminHtml, js: 'js={}'}}});
	let dry = await installer.run({env: goodEnv, store: s, apply: false, rootUid: 'u1'});
	assert.strictEqual(dry.applied, false);
	assert.strictEqual(dry.writes, 4);
	assert.strictEqual(Object.keys(s.data).length, 1);
	let r = await installer.run({env: goodEnv, store: s, apply: true, rootUid: 'u1'});
	assert.strictEqual(r.applied, true);
	assert.strictEqual(s.data['admin/settings'].domain, 'https://site.example');
	assert.deepStrictEqual(s.data['roles/u1'].root, {all: true});
	let site = s.data['dev/site'];
	assert.strictEqual(site.projectId, 'site'); assert.strictEqual(site.default, true); assert.strictEqual(site.stage, 'prod');
	for(const n of ['pixel', 'cl_img', 'proxy', 'shortCode', 'swConfig']) assert.ok(site.cloud[n] && site.cloud[n].code.includes('init'), n);
	for(const n of ['site.json', 'site.css', 'manifest.json', 'firebase-sw.js']) assert.ok(site.component[n], n);
	assert.deepStrictEqual(Object.keys(site.cloud).filter(n=>n[0] == '_'), ['__ready']);
	assert.ok(site.cloud.__ready.code.includes('init'));
	assert.ok(s.data['dev/adm1'].page.html.includes('/site?v=site'));
	assert.strictEqual(s.data['dev/adm1'].page.js, 'js={}');
	assert.ok(Object.keys(s.data).some(k=>k.startsWith('admin/install/log/')));

	// second run: idempotent, nothing overwritten
	let before = JSON.stringify(s.data['dev/site']);
	let again = await installer.run({env: goodEnv, store: s, apply: true, rootUid: 'u1'});
	assert.strictEqual(again.writes, 0);
	assert.strictEqual(JSON.stringify(s.data['dev/site']), before);
	assert.strictEqual(s.data['dev/adm1'].page.html.split('/site?v=site').length, 2);

	// --site-from export wins over the template; no admin project is a named skip
	let s2 = memStore();
	let r2 = await installer.run({env: goodEnv, store: s2, apply: true, siteExport: {cloud: {x: {code: 'js={init:()=>{}}'}}, component: {'app.js': {code: '//'}, bad: {}}}});
	assert.deepStrictEqual(Object.keys(s2.data['dev/site'].cloud), ['x']);
	assert.deepStrictEqual(Object.keys(s2.data['dev/site'].component), ['app.js']);
	assert.ok(r2.steps.find(x=>x.id == 'siteCodeEntry').detail.startsWith('ADMIN_PROJECT_MISSING'));
	assert.strictEqual(r2.steps.find(x=>x.id == 'rootRole').action, 'manual');

	assert.strictEqual(installer.addSiteCodeEntry('<div></div>').status, 'ADMIN_ANCHOR_MISSING');
	console.log('install: ok');
})().catch(e=>{ console.error(e); process.exit(1); });
