// Site shell settings. A site opts in to shell 2 with the site project's
// component site.json: {"platform": {"shell": 2}, "brand": {...}, "theme": {...}}.
// Shell 2 loads the core client from this app (/core/*) instead of the shared
// remote copy, and takes title/favicon/description/colors from site.json brand/theme.
// No site project, no site.json, invalid JSON or shell != 2: nothing changes.
const SHARED_BASE = '//a.alphabetize.us/project/code/cloud/code/iZTQIVnPzPW7b2CzNUmO;WAEzasxjWZSggmwP3MER;';
const LOCAL_BASE = '/core/';
let warned = {};

function warnOnce(code, detail){
	if(warned[code]) return;
	warned[code] = true;
	console.warn(`${code} ${detail || ''}`.trim());
}

// project: the starred site project (auto.getProject('site')) or undefined.
function read(project){
	let item = project && project.component && project.component['site.json'];
	if(!item || typeof item.code != 'string' || !item.code.trim())
		return {};
	try{
		let site = JSON.parse(item.code);
		return (site && typeof site == 'object' && !Array.isArray(site)) ? site : {};
	}catch(e){
		warnOnce('INVALID_SITE_JSON', e.message);
		return {};
	}
}

function version(site){
	return (site && site.platform && Number(site.platform.shell) == 2) ? 2 : 1;
}

// Applies site.json brand/theme onto config for shell 2. Host (subSite) and page
// settings are applied after this by the caller, so they still win.
function brand(config, site){
	if(version(site) != 2) return config;
	let b = site.brand || {}, t = site.theme || {};
	if(b.name) config.title = b.name;
	if(b.favicon) config.favicon = b.favicon;
	if(typeof b.description == 'string') config.description = b.description;
	if(b.icons) config.icons = {...(config.icons || {}), ...b.icons};
	if(t.primary || t.accent)
		config.color = {...(config.color || {}), ...(t.primary ? {primary: t.primary} : {}), ...(t.accent ? {secondary: t.accent} : {})};
	return config;
}

// View locals for head.ejs / scripts.ejs.
function locals(project, site){
	let v = version(site);
	let hasManifest = !!(project && project.component && project.component['manifest.json']);
	return {
		version: v,
		base: v == 2 ? LOCAL_BASE : SHARED_BASE,
		manifest: v == 2 && hasManifest ? '/component/manifest.json' : null
	};
}

function resetWarnings(){ warned = {}; }

module.exports = {SHARED_BASE, LOCAL_BASE, read, version, brand, locals, resetWarnings};
