// Site shell settings. A site opts in to shell 2 with the site project's
// component site.json: {"platform": {"shell": 2}, "brand": {...}, "theme": {...}}.
// Shell 2 loads the core client from this app (/core/*) instead of the shared
// remote copy, and takes title/favicon/description/colors from site.json brand/theme.
// Shell 2 also renders site.json integrations (tracking tags) in the page head, and
// "header": "default" uses the core header (/core/header.html) built from brand + nav.
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
	config.site = {brand: {name: b.name || config.title || '', logo: b.logo || '', tagline: b.tagline || ''}, nav: nav(site)};
	if(t.primary || t.accent)
		config.color = {...(config.color || {}), ...(t.primary ? {primary: t.primary} : {}), ...(t.accent ? {secondary: t.accent} : {})};
	return config;
}

// site.json nav: [{label, href, auth}] (auth true: signed-in only). Invalid items are dropped.
function nav(site){
	let list = Array.isArray(site && site.nav) ? site.nav : [];
	return list.filter(n=>n && typeof n.label == 'string' && typeof n.href == 'string' && /^(\/|https:\/\/)/.test(n.href))
		.map(n=>({label: n.label, href: n.href, auth: !!n.auth}));
}

// site.json integrations: {clarity: '<project id>', xPixel: '<pixel id>'}. Ids must be
// plain tokens; anything else is dropped with a named warning (INVALID_INTEGRATION).
const INTEGRATIONS = ['clarity', 'xPixel'];
function integrations(site){
	let src = (site && site.integrations) || {}, out = {};
	for(let k of INTEGRATIONS){
		if(src[k] == null || src[k] === '') continue;
		if(typeof src[k] == 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(src[k])) out[k] = src[k];
		else warnOnce('INVALID_INTEGRATION', k);
	}
	return out;
}

// View locals for head.ejs / scripts.ejs / index.ejs.
function locals(project, site){
	let v = version(site);
	let hasManifest = !!(project && project.component && project.component['manifest.json']);
	return {
		version: v,
		base: v == 2 ? LOCAL_BASE : SHARED_BASE,
		manifest: v == 2 && hasManifest ? '/component/manifest.json' : null,
		header: v == 2 && site.header == 'default' ? LOCAL_BASE + 'header.html' : null,
		integrations: v == 2 ? integrations(site) : {}
	};
}

function resetWarnings(){ warned = {}; }

module.exports = {SHARED_BASE, LOCAL_BASE, read, version, brand, nav, integrations, locals, resetWarnings};
