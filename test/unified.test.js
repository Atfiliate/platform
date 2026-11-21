// Run: node --test test/unified.test.js
// Unified settings: per-host page config (cloud/siteConfig.js), sub-sites (cloud/sites.js), studio scope,
// scoped /__core/settings, health names. No network.
const test = require('node:test');
const assert = require('assert');
const path = require('path');
const ejs = require('ejs');
const S = require('../cloud/settings.js');
const Sites = require('../cloud/sites.js');
const SC = require('../cloud/siteConfig.js');
const shell = require('../cloud/shell.js');
const route = require('../cloud/settingsRoute.js');

const quiet = {warn: ()=>{}, error: ()=>{}};
const FB = {projectId: 'p', apiKey: 'k', authDomain: 'p.example'};
const envConfig = {firebase: FB, origin: 'https://old.example', title: 'Env Title', login: 'Google,Email', stripe: 'pk_test_abc',
	cloudinary: {cloudName: 'cn', uploadPreset: 'up'}, color: {primary: 'indigo', secondary: 'amber'}, firebaseString: 'x'};
const siteJson = {platform: {shell: 2}, brand: {name: 'Brand Name', logo: 'logo1', tagline: 'Tag'}, theme: {primary: 'teal'}, nav: [{label: 'Home', href: '/'}]};
const siteProject = json=>({component: {'site.json': {code: JSON.stringify(json)}, 'app.js': {code: '//'}}});

function build({values, schema, subSite, sites, env, json}){
	let settings = S.create({log: quiet});
	settings.load({values: values || {}, schema: schema || {}, subSite: subSite || {}, domain: 'https://legacy.example'});
	let st = Sites.create({settings, log: quiet});
	st.load((sites || []).map(d=>({id: d.host, data: d})));
	let e = Object.assign({config: JSON.stringify(envConfig), origin: 'https://main.example', systemEmail: 'env@main.example'}, env || {});
	let sc = SC.create({env: e, settings, sites: st, shell, getProject: ()=>siteProject(json || siteJson), log: quiet});
	return {settings, st, sc};
}
const legacySub = {host: 'sub.example', domain: 'https://sub.example', icon: 'subicon', subTitle: 'Sub tag', css: 'b{}', groupId: 'G1',
	createdBy: 'adminUid', createdOn: 'x', heroku: {cname: 'c', app: 'a'}, purcahse: 'pending', root: 'example'};

test('env mode: same config as before (env, then site.json brand, then sub-site entry, then page), private sub-site records removed', ()=>{
	let {sc} = build({subSite: {'sub.example': legacySub}});
	assert.strictEqual(sc.mode(), 'env');
	let main = sc.page('main.example', {page: {description: 'Page desc'}}, 'production');
	assert.strictEqual(main.title, 'Brand Name');
	assert.deepStrictEqual(main.color, {primary: 'teal', secondary: 'amber'});
	assert.strictEqual(main.origin, 'https://old.example');
	assert.strictEqual(main.description, 'Page desc');
	assert.strictEqual(main.firebaseString, 'x');
	assert.strictEqual(main.environment, 'production');
	let sub = sc.page('sub.example', null);
	assert.strictEqual(sub.icon, 'subicon'); assert.strictEqual(sub.groupId, 'G1'); assert.strictEqual(sub.css, 'b{}');
	for(const k of ['createdBy', 'createdOn', 'heroku', 'purcahse', 'root']) assert.strictEqual(sub[k], undefined, k);
	// handlers: the env config object with email, as before
	let srv = sc.server('sub.example');
	assert.strictEqual(srv.email, 'env@main.example');
	assert.strictEqual(srv, sc.server(null));
	assert.strictEqual(sc.systemEmail('sub.example'), 'env@main.example');
	assert.strictEqual(sc.problems().warnings[0].code, 'CONFIG_LEGACY');
});

const migrated = {configSource: 'settings', title: 'Main', description: 'Main desc', login: 'Google,Email,Quick Connect', stripePublishableKey: 'pk_live_abc123',
	cloudinaryCloudName: 'cn', cloudinaryUploadPreset: 'up', colorPrimary: 'indigo', colorSecondary: 'amber', logo: 'mainlogo', tagline: 'Main tag',
	googleClientId: 'cid.apps.example', googleApiKey: 'AIzaSyA_0123456789abcdefghij', pushPublicKey: 'B'.repeat(80), systemEmail: 'system@main.example', environment: 'beta'};
const subDoc = {host: 'sub.example', domain: 'https://sub.example', enabled: true,
	overrides: {title: 'Sub', logo: 'sublogo', homeGroup: 'G1', css: 'b{}', systemEmail: 'hello@sub.example'},
	meta: {createdBy: 'adminUid', heroku: {cname: 'c'}, emailDomain: 'sub.example'}};

test('settings mode: defaults, then main values, then sub-site overrides, then page title; env gives only firebase', ()=>{
	let {sc} = build({values: migrated, sites: [subDoc]});
	assert.strictEqual(sc.mode(), 'settings');
	let main = sc.page('main.example', null, 'beta');
	assert.deepStrictEqual(main.firebase, FB);
	assert.strictEqual(main.title, 'Main'); assert.strictEqual(main.icon, 'mainlogo'); assert.strictEqual(main.subTitle, 'Main tag');
	assert.deepStrictEqual(main.gapi, {clientId: 'cid.apps.example', key: 'AIzaSyA_0123456789abcdefghij'});
	assert.deepStrictEqual(main.cloudinary, {cloudName: 'cn', uploadPreset: 'up'});
	assert.strictEqual(main.stripe, 'pk_live_abc123');
	assert.strictEqual(main.fire.messagingKey, 'B'.repeat(80));
	assert.strictEqual(main.origin, 'https://main.example');
	assert.deepStrictEqual(main.site, {brand: {name: 'Main', logo: 'mainlogo', tagline: 'Main tag'}, nav: [{label: 'Home', href: '/', auth: false}]});
	// nothing else from env config, site.json brand or the legacy map leaks in
	assert.strictEqual(main.firebaseString, undefined);
	assert.strictEqual(main.groupId, undefined);
	assert.ok(!JSON.stringify(main).includes('system@main.example'));
	let sub = sc.page('SUB.example', {page: {title: 'Page T'}});
	assert.strictEqual(sub.title, 'Page T');
	assert.strictEqual(sub.icon, 'sublogo'); assert.strictEqual(sub.groupId, 'G1'); assert.strictEqual(sub.css, 'b{}');
	assert.strictEqual(sub.subTitle, 'Main tag');
	assert.strictEqual(sub.origin, 'https://sub.example'); assert.strictEqual(sub.host, 'sub.example');
	let s = JSON.stringify(sub);
	for(const k of ['adminUid', 'cname', 'meta', 'emailDomain', 'hello@sub']) assert.ok(!s.includes(k), k);
	// handlers get the same config plus the host's sender
	assert.strictEqual(sc.server('sub.example').email, 'hello@sub.example');
	assert.strictEqual(sc.server('main.example').email, 'system@main.example');
	assert.strictEqual(sc.server('main.example').title, 'Main');
	assert.notStrictEqual(sc.server('main.example'), sc.server('main.example'));
	assert.strictEqual(sc.value('logo', 'sub.example'), 'sublogo');
	assert.strictEqual(sc.value('logo', 'other.example'), 'mainlogo');
});

test('settings mode: missing sender and origin are named; env leftovers and legacy fields are listed (names only)', ()=>{
	let v = Object.assign({}, migrated); delete v.systemEmail;
	let {sc} = build({values: v, subSite: {'sub.example': legacySub}, env: {origin: ''}});
	assert.strictEqual(sc.systemEmail(null), null);
	let p = sc.problems();
	let codes = p.errors.map(e=>e.code + ' ' + e.name);
	assert.ok(codes.includes('SETTING_MISSING systemEmail') && codes.includes('ENV_MISSING origin'));
	let w = p.warnings.map(e=>e.code + ' ' + e.name);
	for(const x of ['CONFIG_ENV_UNUSED config.title', 'CONFIG_ENV_UNUSED config.firebaseString', 'ENV_UNUSED systemEmail', 'LEGACY_SUBSITE_MAP admin/settings.subSite', 'LEGACY_FIELD admin/settings.domain', 'SITE_JSON_BRAND_UNUSED site.json'])
		assert.ok(w.includes(x), x);
	assert.ok(!JSON.stringify(p).includes('env@main.example') && !JSON.stringify(p).includes('Env Title'));
	assert.ok(!w.some(x=>x.includes('config.firebase ')));
});

test('sites: bad docs, unknown and invalid overrides are named and ignored; disabled sites are not applied', ()=>{
	let {st, sc} = build({values: migrated, sites: [
		subDoc,
		{host: 'bad.example', domain: 'http://bad.example'},
		{host: 'x.example', domain: 'https://x.example', overrides: {stripePublishableKey: 'pk_live_x', systemEmail: 'nope', title: 'X'}},
		{host: 'off.example', domain: 'https://off.example', enabled: false, overrides: {title: 'Off'}}
	]});
	let codes = st.problems().map(p=>p.code + ' ' + p.name);
	assert.ok(codes.includes('SITE_INVALID bad.example'));
	assert.ok(codes.includes('SITE_OVERRIDE_UNKNOWN x.example.stripePublishableKey'));
	assert.ok(codes.includes('SITE_OVERRIDE_INVALID x.example.systemEmail'));
	assert.strictEqual(sc.page('x.example').title, 'X');
	assert.strictEqual(sc.page('x.example').stripe, 'pk_live_abc123');
	assert.strictEqual(sc.systemEmail('x.example'), 'system@main.example');
	assert.strictEqual(sc.page('off.example').title, 'Main');
	assert.strictEqual(sc.page('off.example').origin, 'https://main.example');
});

function txDb(store){
	let logs = [];
	return {logs, store, db: {
		doc: p=>({path: p}),
		collection: p=>({doc: ()=>({path: p + '/new'})}),
		runTransaction: fn=>fn({
			get: ref=>Promise.resolve({exists: store[ref.path] !== undefined, data: ()=>store[ref.path]}),
			update: (ref, d)=>{ store[ref.path] = Object.assign({}, store[ref.path], d); },
			set: (ref, d)=>{ if(ref.path.endsWith('/new')) logs.push(d); else store[ref.path] = d; }
		})
	}};
}

test('sites.write: validates host, domain, overrides and meta; creates then updates; keeps meta types; logs names only', async ()=>{
	let {st} = build({values: migrated});
	let f = txDb({});
	await assert.rejects(st.write({db: f.db, uid: 'u1', host: 'Bad Host', patch: {}}), e=>e.status == 400 && e.errors[0].code == 'SITE_INVALID');
	await assert.rejects(st.write({db: f.db, uid: 'u1', host: 'new.example', patch: {domain: 'https://other.example'}}), e=>e.errors[0].name == 'domain');
	await assert.rejects(st.write({db: f.db, uid: 'u1', host: 'new.example', patch: {overrides: {title: 'N'}}}), e=>e.errors[0].message.includes('needs its domain'));
	await assert.rejects(st.write({db: f.db, uid: 'u1', host: 'new.example', patch: {domain: 'https://new.example', overrides: {stripePublishableKey: 'pk_live_x'}}}), e=>e.errors[0].code == 'SITE_OVERRIDE_UNKNOWN');
	await assert.rejects(st.write({db: f.db, uid: 'u1', host: 'new.example', patch: {domain: 'https://new.example', meta: {heroku: {}}}}), e=>e.errors[0].name == 'meta.heroku');
	let r = await st.write({db: f.db, uid: 'u1', host: 'new.example', patch: {domain: 'https://new.example/', overrides: {title: 'New', systemEmail: 'a@new.example'}, meta: {emailDomain: 'new.example'}}});
	assert.deepStrictEqual(r, {host: 'new.example', created: true});
	let d = f.store['admin/settings/sites/new.example'];
	assert.strictEqual(d.domain, 'https://new.example'); assert.strictEqual(d.enabled, true);
	assert.deepStrictEqual(d.overrides, {title: 'New', systemEmail: 'a@new.example'});
	assert.strictEqual(d.meta.createdBy, 'u1'); assert.ok(d.meta.createdOn instanceof Date);
	const ts = {toDate: ()=>new Date()};
	d.meta.heroku = {status: 'ok'}; d.meta.createdOn = ts;
	await st.write({db: f.db, uid: 'u2', host: 'new.example', patch: {overrides: {title: null, logo: 'l'}, enabled: false}});
	d = f.store['admin/settings/sites/new.example'];
	assert.deepStrictEqual(d.overrides, {systemEmail: 'a@new.example', logo: 'l'});
	assert.strictEqual(d.enabled, false); assert.strictEqual(d.meta.createdOn, ts); assert.deepStrictEqual(d.meta.heroku, {status: 'ok'});
	assert.strictEqual(d.meta.updatedBy, 'u2');
	assert.deepStrictEqual(f.logs[1].keys, ['enabled', 'logo', 'title']);
	assert.ok(!JSON.stringify(f.logs).includes('a@new.example'));
});

test('studio scope: own doc, no core definitions, writes admin/studio; canManage per scope', async ()=>{
	let studio = S.create({doc: S.STUDIO_DOC, core: {}, scope: 'studio', log: quiet});
	studio.load({schema: {tutor: {type: 'boolean', default: false, group: 'Studio', section: 'Tutor', description: 'Turns the tutor on.'}}, values: {tutor: true}});
	assert.strictEqual(studio.get('tutor'), true);
	assert.throws(()=>studio.get('environment'), e=>e.code == 'SETTING_UNKNOWN');
	let d = studio.describe();
	assert.strictEqual(d.doc, 'admin/studio'); assert.strictEqual(d.scope, 'studio');
	assert.strictEqual(d.settings[0].description, 'Turns the tutor on.'); assert.strictEqual(d.settings[0].section, 'Tutor');
	let f = txDb({'admin/studio': {values: {tutor: true}}});
	await studio.write({db: f.db, uid: 'u1', patch: {tutor: false}});
	assert.deepStrictEqual(f.store['admin/studio'].values, {tutor: false});
	assert.strictEqual(f.logs[0].scope, 'studio');
	assert.ok(S.canManage({admin: {studio: true}}, 'studio') && !S.canManage({admin: {studio: true}}, 'site') && !S.canManage({admin: {settings: true}}, 'studio'));
	assert.ok(S.canManage({admin: {all: true}}, 'studio') && S.canManage({root: {all: true}}, 'sites') && S.canManage({admin: {settings: true}}, 'sites'));
});

test('schema: client paths and override are checked; reserved paths refused', ()=>{
	assert.deepStrictEqual(S.checkDef('a', {type: 'string', client: 'x.y', override: true}), []);
	for(const c of ['firebase.apiKey', 'origin', 'bad path', 'a.b.c.d.e', 'environment'])
		assert.strictEqual(S.checkDef('a', {type: 'string', client: c})[0].code, 'SCHEMA_INVALID', c);
	assert.strictEqual(S.checkDef('a', {type: 'string', override: 'yes'})[0].code, 'SCHEMA_INVALID');
	// every core definition has a tab, a label and a description
	Object.entries(S.CORE).forEach(([k, d])=>assert.ok(d.group && d.label && d.description, k));
});

function res(){
	let out = {status: 200, headers: {}};
	let r = {setHeader: (k, v)=>{ out.headers[k] = v; }, status: s=>{ out.status = s; return r; }, json: b=>{ out.body = b; out.done(); }};
	out.wait = new Promise(ok=>out.done = ok);
	return {r, out};
}
test('route scopes: studio needs admin.studio; sites lists meta for admins and saves through validation; bad scope 400', async ()=>{
	let {settings, st} = build({values: migrated, sites: [subDoc]});
	let studio = S.create({doc: S.STUDIO_DOC, core: {}, scope: 'studio', log: quiet});
	studio.load({schema: {tutor: {type: 'boolean', default: false}}});
	let store = {'admin/settings/sites/sub.example': JSON.parse(JSON.stringify(subDoc))}, f = txDb(store);
	let mk = roles=>route.create({settings, studio, sites: st, db: ()=>f.db,
		auth: ()=>({verifyIdToken: t=>t == 'good' ? Promise.resolve({uid: 'u1'}) : Promise.reject(new Error('bad'))}), getRoles: ()=>Promise.resolve(roles)});
	let call = async (rt, fn, query, body)=>{ let {r, out} = res(); rt[fn]({headers: {authorization: 'Bearer good'}, query, body}, r); await out.wait; return out; };
	let o = await call(mk({admin: {settings: true}}), 'read', {scope: 'studio'});
	assert.strictEqual(o.status, 403);
	o = await call(mk({admin: {studio: true}}), 'read', {scope: 'studio'});
	assert.strictEqual(o.status, 200); assert.strictEqual(o.body.doc, 'admin/studio');
	o = await call(mk({admin: {studio: true}}), 'save', {scope: 'studio'}, {values: {tutor: true}});
	assert.deepStrictEqual(o.body.saved, ['tutor']); assert.deepStrictEqual(store['admin/studio'].values, {tutor: true});
	o = await call(mk({admin: {settings: true}}), 'read', {scope: 'sites'});
	assert.strictEqual(o.body.sites[0].meta.createdBy, 'adminUid');
	assert.ok(o.body.settings.every(s=>s.override) && o.body.settings.some(s=>s.key == 'systemEmail'));
	o = await call(mk({admin: {settings: true}}), 'save', {scope: 'sites'}, {host: 'sub.example', site: {overrides: {title: 'T2'}}});
	assert.strictEqual(o.status, 200);
	assert.strictEqual(store['admin/settings/sites/sub.example'].overrides.title, 'T2');
	assert.strictEqual(store['admin/settings/sites/sub.example'].meta.createdBy, 'adminUid');
	o = await call(mk({admin: {settings: true}}), 'save', {scope: 'sites'}, {host: 'sub.example', site: {overrides: {colorPrimary: 5}}});
	assert.strictEqual(o.status, 400); assert.strictEqual(o.body.errors[0].code, 'SITE_OVERRIDE_INVALID');
	o = await call(mk({root: true}), 'read', {scope: 'nope'});
	assert.strictEqual(o.status, 400); assert.strictEqual(o.body.errors[0].code, 'SCOPE_INVALID');
});

const views = path.join(__dirname, '../views');
test('page: settings-mode config renders; </script> and </style> in values cannot break out', async ()=>{
	let {sc} = build({values: Object.assign({}, migrated, {title: 'A</script><b>x', css: 'b{} </style><script>x</script>'})});
	let html = await ejs.renderFile(path.join(views, 'pages/index.ejs'), {config: sc.page('main.example', null, 'beta'), shell: {version: 1}, env: {name: 'beta', beta: true}}, {views: [views]});
	assert.ok(!html.includes('A</script><b>x') && html.includes('A\\u003c/script>'));
	assert.ok(!html.includes('</style><script>x'));
	assert.strictEqual((html.match(/class="core-env-bar /g) || []).length, 2);
	let cfg = JSON.parse(html.match(/window\.config = (.*);\n/)[1]);
	assert.strictEqual(cfg.title, 'A</script><b>x');
	assert.deepStrictEqual(cfg.firebase, FB);
});

test('sender name, primary-color text contrast and add-on signing key are typed settings', ()=>{
	const jwk = {kty: 'RSA', alg: 'PS256', e: 'AQAB', n: 'abc', key_ops: ['verify'], ext: true};
	let {sc, settings} = build({values: Object.assign({}, migrated, {systemEmailName: 'Main Site', colorPrimaryContrast: 'light', addonPublicKey: jwk}),
		sites: [Object.assign({}, subDoc, {overrides: Object.assign({}, subDoc.overrides, {systemEmailName: 'Sub Site', colorPrimaryContrast: 'dark'})})]});
	assert.strictEqual(sc.systemSender(null), 'Main Site <system@main.example>');
	assert.strictEqual(sc.systemSender('sub.example'), 'Sub Site <hello@sub.example>');
	let main = sc.page('main.example', null);
	assert.strictEqual(main.color.customPrimary.contrastDefaultColor, 'light');
	assert.strictEqual(main.color.primary, 'indigo');
	assert.deepStrictEqual(main.publicKey, jwk);
	assert.strictEqual(sc.page('sub.example', null).color.customPrimary.contrastDefaultColor, 'dark');
	// no name: the address alone
	assert.strictEqual(build({values: migrated}).sc.systemSender(null), 'system@main.example');
	// env mode: env systemEmail as is
	assert.strictEqual(build({}).sc.systemSender(null), 'env@main.example');
	// invalid values are named errors
	let bad = settings.validate({systemEmailName: 'A <b@c.d>', colorPrimaryContrast: 'grey', systemEmail: 'Name <a@b.c>'});
	const names = bad.errors.map(e=>e.name);
	for(const n of ['systemEmailName', 'colorPrimaryContrast', 'systemEmail']) assert.ok(names.includes(n), n + ' ' + JSON.stringify(bad.errors));
	// a private JWK (signing key) is refused
	assert.ok(settings.validate({addonPublicKey: Object.assign({d: 'secret'}, jwk)}).errors.some(e=>e.name == 'addonPublicKey'));
});

test('page: favicon comes only from the favicon setting (escaped); the upload widget script is the current Cloudinary URL', async ()=>{
	const render = values=>ejs.renderFile(path.join(views, 'pages/index.ejs'), {config: build({values}).sc.page('main.example', null), shell: {version: 1}, env: {name: 'production', beta: false}}, {views: [views]});
	let none = await render(migrated);
	assert.ok(!/rel="shortcut icon"/.test(none), 'no favicon link without the setting');
	assert.ok(!none.includes('res.cloudinary.com/easybusiness'));
	let set = await render(Object.assign({}, migrated, {favicon: 'https://img.example/f.ico?a=1&b="x"'}));
	assert.ok(set.includes('<link rel="shortcut icon" href="https://img.example/f.ico?a=1&amp;b=&#34;x&#34;">'));
	assert.ok(set.includes('<script src="https://upload-widget.cloudinary.com/latest/global/all.js"></script>'));
	assert.ok(!set.includes('widget.cloudinary.com/v2.0') && !set.includes('//widget.cloudinary.com/global'));
});

test('sms sender: a site-defined serviceNumber setting resolves through siteConfig.value; unset is null (named warning, no default)', ()=>{
	let {sc} = build({schema: {serviceNumber: {type: 'string', label: 'SMS number', group: 'Messaging'}}, values: Object.assign({}, migrated, {serviceNumber: '15551230000'})});
	assert.strictEqual(sc.mode(), 'settings');
	assert.strictEqual(sc.value('serviceNumber', null), '15551230000');
	assert.strictEqual(build({values: migrated}).sc.value('serviceNumber', null), null);
});
