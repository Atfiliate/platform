// Sub-sites: one doc per host at admin/settings/sites/{host}.
//   {host, domain, enabled, overrides: {<setting>: value}, meta: {...}}
// overrides hold only settings whose definition has `override: true`; each value is checked
// against its type. meta (who created it, custom-domain and SSL status, email domain,
// purchase status) is private: it is shown in the admin page and never sent to the page config.
// Named problems: SITE_INVALID, SITE_OVERRIDE_UNKNOWN, SITE_OVERRIDE_INVALID.
const {coerce, named} = require('./settings.js');

const COLLECTION = 'admin/settings/sites';
const HOST = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const META_EDIT = ['emailDomain', 'notes'];
const clone = v=>v === undefined ? v : JSON.parse(JSON.stringify(v));

function domainOf(v){
	if(typeof v != 'string' || !/^https:\/\/[^\s/?#]+\/?$/i.test(v.trim())) return null;
	return v.trim().replace(/\/$/, '').toLowerCase();
}

// settings: a settings instance (cloud/settings.js create()) for the override definitions.
function create({settings, log}){
	log = log || console;
	let state = {ready: false, list: {}, problems: []};
	let listeners = [];

	// Typed overrides for one raw doc: {values, problems}.
	function check(host, raw){
		let problems = [], values = {};
		let defs = settings.definitions();
		Object.entries((raw && raw.overrides) || {}).forEach(([k, v])=>{
			let def = defs[k];
			if(!def || !def.override) return problems.push(named('SITE_OVERRIDE_UNKNOWN', `${host}.${k}`, 'Not a setting a sub-site can override (ignored).'));
			if(v === null || v === undefined || v === '') return;
			let r = coerce(def, v);
			if(r.error) problems.push(named('SITE_OVERRIDE_INVALID', `${host}.${k}`, r.error));
			else values[k] = r.value;
		});
		return {values, problems};
	}

	function load(docs){
		let list = {}, problems = [];
		(docs || []).forEach(({id, data})=>{
			let host = String((data && data.host) || id).toLowerCase();
			let domain = domainOf(data && data.domain);
			if(!HOST.test(host) || host != id) return problems.push(named('SITE_INVALID', id, 'Doc id must be the host name (lowercase).'));
			if(!domain || new URL(domain).host != host) return problems.push(named('SITE_INVALID', id, 'domain must be https://<host>.'));
			let c = check(host, data);
			problems.push(...c.problems);
			list[host] = {host, domain, enabled: data.enabled !== false, overrides: c.values, raw: data};
		});
		state = {ready: true, list, problems};
		problems.forEach(p=>log.warn && log.warn(`${p.code} ${p.name}`));
		listeners.forEach(fn=>{ try{ fn(); }catch(e){ log.error && log.error('sites listener failed', e && e.message); } });
		return state;
	}
	// Re-check overrides when the schema changes (a definition may have lost `override`).
	settings.onChange && settings.onChange(()=>{ if(state.ready) load(Object.values(state.list).map(s=>({id: s.host, data: s.raw}))); });

	// The enabled sub-site for a request host, or null (the main site).
	function forHost(host){
		let s = host && state.list[String(host).toLowerCase()];
		return s && s.enabled ? s : null;
	}

	// Admin page: every sub-site with its private meta.
	function describe(){
		return {ready: state.ready, problems: state.problems.slice(), sites: Object.values(state.list).map(s=>({
			host: s.host, domain: s.domain, enabled: s.enabled, overrides: clone(s.raw.overrides || {}), meta: clone(s.raw.meta || {})
		}))};
	}

	// Creates or updates one sub-site. patch: {domain?, enabled?, overrides?: {k: v|null}, meta?: {emailDomain, notes}}.
	function write({db, uid, host, patch}){
		host = String(host || '').toLowerCase();
		let errors = [];
		if(!HOST.test(host)) errors.push(named('SITE_INVALID', 'host', 'host must be a domain name like www.example.org.'));
		patch = (patch && typeof patch == 'object' && !Array.isArray(patch)) ? patch : {};
		let domain = patch.domain !== undefined ? domainOf(patch.domain) : undefined;
		if(patch.domain !== undefined && (!domain || new URL(domain).host != host)) errors.push(named('SITE_INVALID', 'domain', 'domain must be https://<host>.'));
		if(patch.enabled !== undefined && typeof patch.enabled != 'boolean') errors.push(named('SITE_INVALID', 'enabled', 'enabled must be true or false.'));
		let defs = settings.definitions(), ov = {};
		Object.entries(patch.overrides || {}).forEach(([k, v])=>{
			let def = defs[k];
			if(!def || !def.override) return errors.push(named('SITE_OVERRIDE_UNKNOWN', k, 'Not a setting a sub-site can override.'));
			if(v === null || v === undefined || v === '') return ov[k] = null;
			let r = coerce(def, v);
			if(r.error) errors.push(named('SITE_OVERRIDE_INVALID', k, r.error));
			else ov[k] = r.value;
		});
		let meta = {};
		Object.entries(patch.meta || {}).forEach(([k, v])=>{
			if(!META_EDIT.includes(k)) return errors.push(named('SITE_INVALID', `meta.${k}`, `Only ${META_EDIT.join(', ')} can be set here.`));
			if(v !== null && (typeof v != 'string' || v.length > 500)) return errors.push(named('SITE_INVALID', `meta.${k}`, 'must be text (500 characters at most).'));
			meta[k] = v;
		});
		if(errors.length) return Promise.reject({status: 400, errors});
		let ref = db.doc(`${COLLECTION}/${host}`);
		return db.runTransaction(t=>t.get(ref).then(s=>{
			let cur = s.exists ? s.data() : null;
			if(!cur && !domain) return Promise.reject({status: 400, errors: [named('SITE_INVALID', 'domain', 'A new sub-site needs its domain.')]});
			// Shallow copies keep Firestore types (timestamps) in meta as they are.
			let next = cur ? Object.assign({}, cur) : {host, domain, enabled: true, overrides: {}, meta: {createdBy: uid, createdOn: new Date()}};
			if(domain) next.domain = domain;
			if(patch.enabled !== undefined) next.enabled = patch.enabled;
			next.overrides = Object.assign({}, next.overrides || {});
			Object.entries(ov).forEach(([k, v])=>{ if(v === null) delete next.overrides[k]; else next.overrides[k] = v; });
			next.meta = Object.assign({}, next.meta || {});
			Object.entries(meta).forEach(([k, v])=>{ if(v === null) delete next.meta[k]; else next.meta[k] = v; });
			next.meta.updatedBy = uid;
			next.meta.updatedOn = new Date();
			t.set(ref, next);
			t.set(db.collection('admin/settings/log').doc(), {at: new Date(), by: uid, scope: 'sites', host, created: !cur,
				keys: Object.keys(ov).concat(Object.keys(meta).map(k=>'meta.' + k), patch.domain !== undefined ? ['domain'] : [], patch.enabled !== undefined ? ['enabled'] : []).sort()});
			return {host, created: !cur};
		}));
	}

	let watching = false;
	function watch(db){
		if(watching) return;
		watching = true;
		db.collection(COLLECTION).onSnapshot(qs=>load(qs.docs.map(d=>({id: d.id, data: d.data()}))), e=>{
			log.error && log.error('SITES_WATCH_FAILED', e && e.message);
			watching = false;
			let t = setTimeout(()=>watch(db), 30000);
			t.unref && t.unref();
		});
	}

	return {load, forHost, describe, write, watch, check, onChange: fn=>listeners.push(fn),
		problems: ()=>state.problems.slice(), isReady: ()=>state.ready, hosts: ()=>Object.keys(state.list)};
}

let shared = null;
module.exports = {create, COLLECTION, HOST, domainOf, get shared(){ return shared || (shared = create({settings: require('./settings.js').shared})); }};
