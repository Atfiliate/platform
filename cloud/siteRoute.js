// Legacy /cloud/:name and /component/:name resolve to the site project first.
// The site and core projects have fixed homes: dev/site and dev/core (doc id ==
// projectId). Until a site has the fixed doc, the starred version is used and
// FIXED_ID_FALLBACK is logged. Only when that project does not have the item does the
// request fall back to the legacy RTDB site/private endpoints/components.
// Sites without a 'site' project always fall back, exactly as before.
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

// kind: 'cloud' | 'component'. Components also match the legacy name_ext form.
function find(filecache, kind, name){
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

module.exports = {SITE_PROJECT, fixed, siteProject, find, contentType, warn, resetWarnings};
