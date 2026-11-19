// The site project lives at the fixed home dev/site (doc id == projectId 'site'). Nothing else is used.
// Cloud handlers named '__<name>' (double underscore) are startup functions: dev/site runs them
// at boot, and no project serves them over HTTP. A single '_<name>' handler is a normal endpoint.
// /cloud/:name and /component/:name are served only from the site project.
const SITE_PROJECT = 'site';
const WARN_EVERY_MS = 10 * 60 * 1000;
let lastWarn = {};

// The site project from the dev cache: dev/site only.
function siteProject(filecache){
	let entry = filecache && filecache[SITE_PROJECT];
	return (entry && entry.snaps && entry.snaps[SITE_PROJECT]) || null;
}

const STARTUP_PREFIX = '__';
const isStartup = (name)=>typeof name == 'string' && name.length > STARTUP_PREFIX.length && name.startsWith(STARTUP_PREFIX);
// Startup functions in a site project doc: [{name, code}] for cloud handlers named '__<name>'.
function startup(doc){
	return Object.entries((doc && doc.cloud) || {})
		.filter(([n, item])=>isStartup(n) && item && typeof item.code == 'string' && item.code)
		.map(([name, item])=>({name, code: item.code}));
}

// kind: 'cloud' | 'component'. Names match exactly.
function find(filecache, kind, name){
	if(kind == 'cloud' && isStartup(name))
		return null;
	let proj = siteProject(filecache);
	if(!proj || !proj[kind] || !name)
		return null;
	let item = proj[kind][name];
	if(item && typeof item.code == 'string' && item.code)
		return {name, item, vid: proj.id};
	return null;
}

// By file extension only.
function contentType(name){
	let n = String(name || '').toLowerCase();
	if(/\.json$/.test(n)) return 'application/json';
	if(/\.css$/.test(n)) return 'text/css';
	if(/\.(m?js)$/.test(n)) return 'application/javascript';
	if(/\.html$/.test(n)) return 'text/html; charset=utf-8';
	return null;
}

// Named warning, at most once per item per WARN_EVERY_MS so busy endpoints do not flood logs.
function warn(code, kind, name, now){
	now = now || Date.now();
	let key = `${code}:${kind}/${name}`;
	if(lastWarn[key] && now - lastWarn[key] < WARN_EVERY_MS)
		return false;
	lastWarn[key] = now;
	console.warn(`${code} ${kind}/${name}`);
	return true;
}
function resetWarnings(){
	lastWarn = {};
}

module.exports = {SITE_PROJECT, STARTUP_PREFIX, siteProject, isStartup, startup, find, contentType, warn, resetWarnings};
