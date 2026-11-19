// Site shell settings. A site opts in to shell 2 with the site project's
// component site.json: {"platform": {"shell": 2}, "brand": {...}, "theme": {...}}.
// Shell 2 loads the client from this site's own site project (dev/site) in
// Firestore (/project/site/component/*), takes title/favicon/description/colors from
// site.json brand/theme, and renders the site project's head.html into the page head.
// "header": "default" uses the site project's header.html.
// No site project, no site.json, invalid JSON or shell != 2: nothing changes.
// Shell 2 without app.js in the site project: named warning MISSING_CLIENT, shell 1 is used.
const SHARED_BASE = '//a.alphabetize.us/project/code/cloud/code/iZTQIVnPzPW7b2CzNUmO;WAEzasxjWZSggmwP3MER;';
const CORE_BASE = '/project/site/component/';
let warned = {};

function warnOnce(code, detail){
	if(warned[code]) return;
	warned[code] = true;
	console.warn(`${code} ${detail || ''}`.trim());
}

// project: the site project (shell.project(auto.getProject, 'site')) or undefined.
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

// View locals for head.ejs / scripts.ejs / index.ejs.
// project: the site project (dev/site); it also holds the client files.
function locals(project, site){
	let v = version(site);
	if(v == 2 && !(project && project.component && project.component['app.js'])){
		warnOnce('MISSING_CLIENT', 'shell 2 needs app.js in the site project; using shell 1');
		v = 1;
	}
	let comp = (project && project.component) || {};
	let head = comp['head.html'] && typeof comp['head.html'].code == 'string' ? comp['head.html'].code : '';
	return {
		version: v,
		base: v == 2 ? CORE_BASE : SHARED_BASE,
		manifest: v == 2 && comp['manifest.json'] ? '/component/manifest.json' : null,
		header: v == 2 && site.header == 'default' ? CORE_BASE + 'header.html' : null,
		head: v == 2 ? head : ''
	};
}

// The project at its fixed home dev/{id} (doc id == projectId); get is auto.getProject.
function project(get, id){ return get(id, id) || null; }

function resetWarnings(){ warned = {}; }

module.exports = {SHARED_BASE, CORE_BASE, project, read, version, brand, nav, locals, resetWarnings};
