// The site project lives at the fixed home dev/site (doc id == projectId). Until a
// site has that doc, the starred 'site' version is used and FIXED_ID_FALLBACK is logged.
// Cloud handlers named '_<name>' are startup functions: run at boot, never served.
// /cloud/:name and /component/:name are served only from the site project.
const SITE_PROJECT = 'site';
const WARN_EVERY_MS = 10 * 60 * 1000;
let lastWarn = {};

// get: a getProject-style lookup, get(projectId, vid) or get(projectId) for the starred one.
function fixed(get, id){
	let proj = get(id, id);
	if(proj) return proj;
	proj = get(id);
	if(proj) warn('FIXED_ID_FALLBACK', 'dev', id);
	return proj || null;
}
function siteProject(filecache){
	return fixed((id, vid)=>{
		let entry = filecache && filecache[id];
		return entry ? (vid ? entry.snaps && entry.snaps[vid] : entry.default) : null;
	}, SITE_PROJECT);
}

const isStartup = (name)=>typeof name == 'string' && name[0] == '_';
// Startup functions in a site project doc: [{name, code}] for cloud handlers named '_<name>'.
function startup(doc){
	return Object.entries((doc && doc.cloud) || {})
		.filter(([n, item])=>isStartup(n) && item && typeof item.code == 'string' && item.code)
		.map(([name, item])=>({name, code: item.code}));
}

// kind: 'cloud' | 'component'. Components also match the legacy name_ext form.
function find(filecache, kind, name){
	if(kind == 'cloud' && isStartup(name))
		return null;
	let proj = siteProject(filecache);
	if(!proj || !proj[kind] || !name)
		return null;
	let names = [name];
	if(kind == 'component'){
		let underscored = name.split('.').join('_');
		if(underscored != name) names.push(underscored);
	}
	for(let n of names){
		let item = proj[kind][n];
		if(item && typeof item.code == 'string' && item.code)
			return {name: n, item, vid: proj.id};
	}
	return null;
}

// Extension-based, checked json/css before js (the legacy check serves *_json as JS).
function contentType(name){
	let n = String(name || '').toLowerCase();
	if(/[._]json$/.test(n)) return 'application/json';
	if(/[._]css$/.test(n)) return 'text/css';
	if(/[._]js$/.test(n)) return 'application/javascript';
	if(/[._]html$/.test(n)) return 'text/html; charset=utf-8';
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

module.exports = {SITE_PROJECT, fixed, siteProject, isStartup, startup, find, contentType, warn, resetWarnings};
