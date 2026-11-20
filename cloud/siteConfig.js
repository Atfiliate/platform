// One page config per host, used for both the page (window.config) and cloud handlers (`config`).
//
// configSource (core setting) picks the source:
//   env       sites not migrated yet: the host's `config` JSON, then site.json brand/theme (shell 2),
//             then the legacy admin/settings.subSite[host] entry (its private records left out),
//             then the page title. Handlers get the env config, as before.
//   settings  env gives only `config.firebase`. Then, in this order (later wins):
//             schema defaults -> admin/settings values -> the sub-site's overrides
//             (admin/settings/sites/{host}) -> the project page title/description.
//             origin is env `origin` on the main site and the sub-site's own domain on a sub-site.
//             The sender address is the systemEmail setting (a sub-site may override it).
// Only definitions with a `client` path reach the page; sub-site meta never does.
const {named} = require('./settings.js');

// Legacy subSite entries carry records that must not reach visitors.
const PRIVATE_SUBSITE = ['createdBy', 'createdOn', 'updatedBy', 'updatedOn', 'heroku', 'purcahse', 'purchase', 'premium', 'root', '$registration'];
const clone = v=>v === undefined ? v : JSON.parse(JSON.stringify(v));

function setPath(o, path, v){
	let keys = path.split('.'), last = keys.pop();
	keys.forEach(k=>{ o = (o[k] && typeof o[k] == 'object') ? o[k] : (o[k] = {}); });
	o[last] = v;
}

function parseConfig(env){
	if(!env.config) return {};
	try{ return JSON.parse(env.config) || {}; }catch(e){ return {}; }
}

// opts: {env, settings, sites, shell, getProject (auto.getProject), log}
function create(opts){
	let env = opts.env || process.env;
	let {settings, sites, shell} = opts;
	let log = opts.log || console;
	let getProject = opts.getProject || null;
	let Config = opts.config || parseConfig(env);
	let legacyServer = null;
	let warned = {};
	let warnOnce = (code, name)=>{ if(warned[code + name]) return; warned[code + name] = true; log.warn && log.warn(`${code} ${name}`); };

	function mode(){
		try{ return settings.get('configSource') == 'settings' ? 'settings' : 'env'; }
		catch(e){ return 'env'; }
	}
	function siteJson(){
		if(!getProject || !shell) return {project: null, site: {}};
		let project = shell.project(getProject, 'site');
		return {project, site: shell.read(project)};
	}
	// A setting's value for a host: the sub-site's override when it has one, else the main value or default.
	function value(name, host){
		let sub = sites && sites.forHost(host);
		let def = settings.definitions()[name];
		if(sub && def && def.override && sub.overrides[name] !== undefined) return clone(sub.overrides[name]);
		try{ return settings.get(name); }
		catch(e){ warnOnce(e.code || 'SETTING_INVALID', name); return null; }
	}
	function legacySub(host){
		let map = (settings.raw() || {}).subSite || {};
		let sub = map[host];
		if(!sub || typeof sub != 'object') return null;
		let pub = {};
		Object.keys(sub).filter(k=>!PRIVATE_SUBSITE.includes(k)).forEach(k=>{ pub[k] = sub[k]; });
		return pub;
	}
	function originFor(host){
		if(mode() == 'env') return null;
		let sub = sites && sites.forHost(host);
		if(sub) return sub.domain;
		if(!env.origin){ warnOnce('ENV_MISSING', 'origin'); return null; }
		return String(env.origin).replace(/\/$/, '');
	}
	function systemEmail(host){
		if(mode() == 'env') return env.systemEmail || null;
		let v = value('systemEmail', host);
		if(!v) warnOnce('SETTING_MISSING', 'systemEmail');
		return v || null;
	}

	// The From value for system email: "Name <address>" when a sender name is set, else the address. env mode: env systemEmail as is.
	function systemSender(host){
		let address = systemEmail(host);
		if(mode() == 'env' || !address) return address;
		let name = value('systemEmailName', host);
		return name ? `${name} <${address}>` : address;
	}

	// The page config for a request host; page: the project being shown (title/description win).
	function page(host, project, environment){
		let {site} = siteJson();
		let c;
		if(mode() == 'env'){
			c = Object.assign({}, Config);
			if(shell) shell.brand(c, site);
			let sub = legacySub(host);
			if(sub) Object.assign(c, sub);
		}else{
			c = {};
			if(Config.firebase) c.firebase = clone(Config.firebase);
			let defs = settings.definitions();
			Object.entries(defs).forEach(([k, d])=>{
				if(!d.client) return;
				let v = value(k, host);
				if(v !== null && v !== undefined && v !== '') setPath(c, d.client, v);
			});
			let sub = sites && sites.forHost(host);
			let origin = originFor(host);
			if(origin) c.origin = origin;
			if(sub){ c.host = sub.host; c.domain = sub.domain; }
			if(shell && shell.version(site) == 2)
				c.site = {brand: {name: c.title || '', logo: c.icon || '', tagline: c.subTitle || ''}, nav: shell.nav(site)};
		}
		if(project && project.page && project.page.title) c.title = project.page.title;
		if(project && project.page && project.page.description) c.description = project.page.description;
		if(environment !== undefined) c.environment = environment;
		return c;
	}

	// Handler `config` for a request host. env mode: the one env config object (as before).
	function server(host){
		if(mode() == 'env'){
			if(!legacyServer){
				legacyServer = parseConfig(env);
				legacyServer.email = legacyServer.email || env.systemEmail;
			}
			return legacyServer;
		}
		let c = page(host, null);
		c.email = systemEmail(host);
		return c;
	}

	// Names only, for /__core/health.
	function problems(){
		let errors = [], warnings = [];
		if(mode() == 'env'){
			warnings.push(named('CONFIG_LEGACY', 'configSource', 'The page config comes from the host `config` JSON; migrate it to settings.'));
			return {errors, warnings};
		}
		Object.keys(Config).filter(k=>k != 'firebase').forEach(k=>warnings.push(named('CONFIG_ENV_UNUSED', `config.${k}`, 'Not read in settings mode; remove it from env.')));
		if(env.systemEmail) warnings.push(named('ENV_UNUSED', 'systemEmail', 'The sender is the systemEmail setting; remove it from env.'));
		if(!env.origin) errors.push(named('ENV_MISSING', 'origin', 'Missing env: origin'));
		if(!value('systemEmail', null)) errors.push(named('SETTING_MISSING', 'systemEmail', 'Sender email is not set (admin Messaging tab).'));
		let raw = settings.raw() || {};
		if(raw.subSite && Object.keys(raw.subSite).length) warnings.push(named('LEGACY_SUBSITE_MAP', 'admin/settings.subSite', `${Object.keys(raw.subSite).length} legacy entries are not read in settings mode (proposed delete).`));
		if(raw.domain !== undefined) warnings.push(named('LEGACY_FIELD', 'admin/settings.domain', 'Not read in settings mode; the site address is env origin (proposed delete).'));
		let {site} = siteJson();
		if(site.brand || site.theme) warnings.push(named('SITE_JSON_BRAND_UNUSED', 'site.json', 'brand/theme are not read in settings mode; branding is in admin/settings.'));
		return {errors, warnings};
	}

	return {mode, page, server, value, systemEmail, systemSender, originFor, problems, setProjectGetter: fn=>{ getProject = fn; }, PRIVATE_SUBSITE};
}

let shared = null;
module.exports = {create, setPath, PRIVATE_SUBSITE, get shared(){
	return shared || (shared = create({env: process.env, settings: require('./settings.js').shared, sites: require('./sites.js').shared, shell: require('./shell.js')}));
}};
