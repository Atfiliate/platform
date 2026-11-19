// New-site installer: plans and applies the first install from install/manifest.json.
// Idempotent and additive: it creates what is missing and never overwrites existing
// data (an existing dev/site is reported, not replaced). Names only in output; it never
// prints env or data values.
//
// store: {get(path) -> Promise<data|null>, set(path, data, {merge}) -> Promise,
//         query(collection, [[field, op, value]...]) -> Promise<[{id, data}]>}
const fs = require('fs');
const path = require('path');
const manifest = require('./manifest.json');

const SITE_DIR = path.join(__dirname, 'site');
const SITE_CODE_ENTRY = [
	'\t\t\t\t<md-list-item md-whiteframe="2" aria-label="Site Code" ng-href="/site?v=site" target="_blank">',
	'\t\t\t\t\t<div class="md-list-item-text" layout="column">',
	'\t\t\t\t\t\t<b>Site Code</b>',
	'\t\t\t\t\t\t<span>Open, then Ctrl+E to edit</span>',
	'\t\t\t\t\t</div>',
	'\t\t\t\t</md-list-item>',
	''
].join('\n');
const ROOT_ROLES = {root: {all: true}, admin: {all: true}, developer: {all: true}};

function named(code, name, message){
	return {code, name, message};
}

function empty(v){
	return v === undefined || v === null || v === '';
}

// Every env name the platform and the site template read, with a named error for each gap.
// mode: the site's configSource. New installs use 'settings' (the sender address is a setting);
// a site still on 'env' also needs the envModeOnly names (systemEmail).
function checkEnv(env, mode){
	let errors = [], warnings = [];
	manifest.env.required.concat(mode == 'env' ? (manifest.env.envModeOnly || []) : []).forEach(({name})=>{
		if(empty(env[name])) errors.push(named('MISSING_ENV', name, `Missing env: ${name}`));
	});
	manifest.env.optional.forEach(({name, feature})=>{
		if(empty(env[name])) warnings.push(named('MISSING_ENV', name, `Missing env: ${name} (needed for: ${feature})`));
	});
	[['config', manifest.env.configKeys], ['googleJson', manifest.env.googleJsonKeys || []]].forEach(([name, keys])=>{
		if(empty(env[name])) return;
		let parsed;
		try{ parsed = JSON.parse(env[name]); }catch(e){ return errors.push(named('INVALID_ENV', name, `Invalid JSON in env: ${name}`)); }
		keys.forEach(k=>{
			let v = k.split('.').reduce((o, p)=>(o && typeof o == 'object') ? o[p] : undefined, parsed);
			if(empty(v)) errors.push(named('MISSING_CONFIG', `${name}.${k}`, `Missing env key: ${name}.${k}`));
		});
	});
	return {errors, warnings};
}

function siteSeed(site){
	const {coerce, CORE} = require('../cloud/settings.js');
	let values = {configSource: 'settings'}, errors = [], names = [];
	['title', 'systemEmail', 'environment'].forEach(k=>{
		if(empty(site[k])) return;
		let r = coerce(CORE[k], site[k]);
		if(r.error) errors.push(named('SETTING_INVALID', k, `${k} ${r.error}`));
		else{ values[k] = r.value; names.push(k); }
	});
	let missing = ['title', 'systemEmail'].filter(k=>values[k] === undefined);
	return {values, errors, names, missing};
}

function readTemplate(dir){
	dir = dir || SITE_DIR;
	let pick = (sub)=>{
		let out = {};
		let d = path.join(dir, sub);
		if(!fs.existsSync(d)) return out;
		fs.readdirSync(d).sort().forEach(f=>{
			let id = sub == 'cloud' ? f.replace(/\.js$/, '') : f;
			out[id] = {id, code: fs.readFileSync(path.join(d, f), 'utf8')};
		});
		return out;
	};
	return {cloud: pick('cloud'), component: pick('component')};
}

// export: a dev/site doc saved by `apply.js export` ({cloud, component}).
function sitePackage(fromExport){
	let src = fromExport || readTemplate();
	let clean = (items)=>{
		let out = {};
		Object.entries(items || {}).forEach(([id, item])=>{
			if(item && typeof item.code == 'string') out[id] = {id, code: item.code};
		});
		return out;
	};
	return {cloud: clean(src.cloud), component: clean(src.component)};
}

function addSiteCodeEntry(html){
	if(typeof html != 'string') return {html, status: 'ADMIN_PAGE_MISSING'};
	if(html.indexOf('/site?v=site') != -1) return {html, status: 'PRESENT'};
	let i = html.indexOf('</md-list>');
	if(i == -1) return {html, status: 'ADMIN_ANCHOR_MISSING'};
	let lineStart = html.lastIndexOf('\n', i) + 1;
	return {html: html.slice(0, lineStart) + SITE_CODE_ENTRY + html.slice(lineStart), status: 'ADDED'};
}

// opts: {env, store, apply, rootUid, siteExport, now, auth}
async function plan(opts){
	let {env, store} = opts;
	let now = opts.now || new Date();
	let steps = [];
	let add = (id, action, detail, write)=>steps.push({id, action, detail, write});
	let envResult = checkEnv(env || {});
	add('env', envResult.errors.length ? 'blocked' : 'ok', envResult.errors.map(e=>e.name).join(', ') || 'all required env present');

	// New-site seed: settings mode from the start. opts.site: {title, systemEmail, environment} (each checked
	// against the core schema); anything left out is set later in the admin settings tabs.
	let settings = await store.get('admin/settings');
	if(settings) add('settings', 'none', 'admin/settings exists');
	else{
		let seed = siteSeed(opts.site || {});
		seed.errors.forEach(e=>envResult.errors.push(e));
		add('settings', seed.errors.length ? 'blocked' : 'create', `admin/settings: configSource settings${seed.names.length ? ', ' + seed.names.join(', ') : ''}${seed.missing.length ? ' (set later: ' + seed.missing.join(', ') + ')' : ''}`,
			seed.errors.length ? undefined : {path: 'admin/settings', data: {values: seed.values, schema: {}, createdOn: now}});
	}
	let studio = await store.get('admin/studio');
	if(studio) add('studioSettings', 'none', 'admin/studio exists');
	else add('studioSettings', 'create', 'admin/studio (studio settings, empty)', {path: 'admin/studio', data: {values: {}, schema: {}, createdOn: now}});

	if(opts.rootUid){
		let roles = await store.get(`roles/${opts.rootUid}`);
		let isRoot = roles && roles.root && (roles.root === true || roles.root.all);
		if(isRoot) add('rootRole', 'none', `roles/${opts.rootUid} is already root`);
		else add('rootRole', 'merge', `roles/${opts.rootUid}: root, admin and developer (all)`, {path: `roles/${opts.rootUid}`, data: ROOT_ROLES, merge: true});
	}else{
		let anyRoot = await store.query('roles', [['root.all', '==', true]]);
		add('rootRole', anyRoot.length ? 'none' : 'manual', anyRoot.length ? 'a root role exists' : 'no root yet: re-run with --root-email <email> or --root-uid <uid>');
	}

	let site = await store.get('dev/site');
	if(site) add('siteProject', 'none', 'dev/site exists (left as is)');
	else{
		let pkg = sitePackage(opts.siteExport);
		add('siteProject', 'create', `dev/site: ${Object.keys(pkg.cloud).length} cloud, ${Object.keys(pkg.component).length} components`, {
			path: 'dev/site',
			data: {id: 'site', projectId: 'site', stage: 'prod', default: true, versionId: 'site', title: 'Site', cloud: pkg.cloud, component: pkg.component, page: {}, createdOn: now}
		});
	}

	let admins = await store.query('dev', [['projectId', '==', 'admin'], ['default', '==', true]]);
	let admin = admins.find(a=>a.data && a.data.stage == 'prod') || admins[0];
	if(!admin) add('siteCodeEntry', 'skip', 'ADMIN_PROJECT_MISSING: no starred admin project; open /site?v=site directly');
	else{
		let r = addSiteCodeEntry(admin.data.page && admin.data.page.html);
		if(r.status == 'ADDED') add('siteCodeEntry', 'update', `dev/${admin.id} page.html: add Site Code entry`, {path: `dev/${admin.id}`, data: {page: Object.assign({}, admin.data.page, {html: r.html})}, merge: true});
		else add('siteCodeEntry', r.status == 'PRESENT' ? 'none' : 'skip', `${r.status} (dev/${admin.id})`);
	}

	add('rules', 'manual', 'install/firestore.rules: release with --rules (new projects only) or merge by hand');
	add('manageGroup', 'manual', 'acl/db/groups/manage and its Comm templates: copy from a source site');
	return {envResult, steps};
}

async function run(opts){
	let result = await plan(opts);
	let blocked = result.envResult.errors.length > 0;
	let writes = result.steps.filter(s=>s.write);
	if(!opts.apply || blocked) return Object.assign(result, {applied: false, blocked, writes: writes.length});
	for(let s of writes)
		await opts.store.set(s.write.path, s.write.data, {merge: !!s.write.merge});
	let log = {on: opts.now || new Date(), steps: result.steps.map(s=>({id: s.id, action: s.action}))};
	await opts.store.set(`admin/install/log/${Date.now()}`, log, {merge: false});
	return Object.assign(result, {applied: true, blocked, writes: writes.length});
}

module.exports = {checkEnv, siteSeed, plan, run, sitePackage, readTemplate, addSiteCodeEntry, named, ROOT_ROLES, SITE_CODE_ENTRY};
