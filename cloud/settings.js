// Site settings: one Firestore doc, admin/settings.
//   values: {<key>: <value>}          non-secret settings, edited in the admin page
//   schema: {<key>: <definition>}     the site's own setting definitions (core ones are in install/settings.schema.json)
//   valuesMeta: {updatedBy, updatedOn, keys}
// Secrets stay in env. A setting is never read from env (no env fallback).
// get(name): the stored value, else the definition's default, else null when optional.
// Named errors (thrown as SettingError, code + setting): SETTINGS_NOT_READY, SETTING_UNKNOWN,
// SETTING_MISSING (required, no value, no default), SETTING_INVALID (stored value fails its type).
const CORE = require('../install/settings.schema.json').settings;

const DOC = 'admin/settings';
const TYPES = ['string', 'text', 'number', 'integer', 'boolean', 'enum', 'list', 'url', 'email', 'json'];
const KEY = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const DEF_KEYS = ['type', 'label', 'group', 'help', 'options', 'min', 'max', 'pattern', 'required', 'default', 'public', 'maxLength', 'env'];
const MAX_TEXT = 20000;

class SettingError extends Error{
	constructor(code, setting, message){
		super(`${code} ${setting}: ${message}`);
		this.code = code;
		this.setting = setting;
	}
}
function named(code, name, message){
	return {code, name, message};
}
const clone = v=>v === undefined ? v : JSON.parse(JSON.stringify(v));

// Checks one definition; returns a list of problems (empty when it is valid).
function checkDef(key, def){
	let p = [];
	if(!KEY.test(key)) p.push(named('SCHEMA_INVALID', key, 'Setting names are letters, digits and _ (start with a letter).'));
	if(!def || typeof def != 'object' || Array.isArray(def)) return p.concat(named('SCHEMA_INVALID', key, 'Definition must be an object.'));
	if(!TYPES.includes(def.type)) p.push(named('SCHEMA_INVALID', key, `Unknown type: ${def.type}`));
	if(def.type == 'enum' && !(Array.isArray(def.options) && def.options.length && def.options.every(o=>typeof o == 'string')))
		p.push(named('SCHEMA_INVALID', key, 'enum needs options (a list of strings).'));
	if(def.pattern !== undefined){
		try{ new RegExp(def.pattern); }catch(e){ p.push(named('SCHEMA_INVALID', key, 'pattern is not a valid regular expression.')); }
	}
	Object.keys(def).filter(k=>!DEF_KEYS.includes(k)).forEach(k=>p.push(named('SCHEMA_INVALID', key, `Unknown definition field: ${k}`)));
	if(!p.length && def.default !== undefined){
		let r = coerce(def, def.default);
		if(r.error) p.push(named('SCHEMA_INVALID', key, `default: ${r.error}`));
	}
	return p;
}

// Validates and normalizes a value for a definition: {value} or {error}.
function coerce(def, v){
	let t = def.type;
	if(t == 'string' || t == 'text' || t == 'url' || t == 'email' || t == 'enum'){
		if(typeof v != 'string') return {error: 'must be text'};
		v = t == 'text' ? v : v.trim();
		let max = def.maxLength || (t == 'text' ? MAX_TEXT : 2000);
		if(v.length > max) return {error: `must be at most ${max} characters`};
		if(t == 'url' && !/^https:\/\/[^\s/$.?#][^\s]*$/i.test(v)) return {error: 'must be an https:// URL'};
		if(t == 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return {error: 'must be an email address'};
		if(t == 'enum' && !def.options.includes(v)) return {error: `must be one of: ${def.options.join(', ')}`};
		if(def.pattern && !(new RegExp(def.pattern)).test(v)) return {error: `must match ${def.pattern}`};
		return {value: v};
	}
	if(t == 'number' || t == 'integer'){
		if(typeof v != 'number' || !Number.isFinite(v)) return {error: 'must be a number'};
		if(t == 'integer' && !Number.isInteger(v)) return {error: 'must be a whole number'};
		if(def.min !== undefined && v < def.min) return {error: `must be at least ${def.min}`};
		if(def.max !== undefined && v > def.max) return {error: `must be at most ${def.max}`};
		return {value: v};
	}
	if(t == 'boolean'){
		if(typeof v != 'boolean') return {error: 'must be true or false'};
		return {value: v};
	}
	if(t == 'list'){
		if(!Array.isArray(v) || !v.every(x=>typeof x == 'string')) return {error: 'must be a list of text items'};
		let list = v.map(x=>x.trim()).filter(Boolean);
		if(list.length > 500) return {error: 'must have at most 500 items'};
		if(def.pattern && !list.every(x=>(new RegExp(def.pattern)).test(x))) return {error: `every item must match ${def.pattern}`};
		return {value: list};
	}
	if(t == 'json'){
		if(v === null || typeof v != 'object') return {error: 'must be a JSON object or list'};
		if(JSON.stringify(v).length > MAX_TEXT) return {error: `must be at most ${MAX_TEXT} characters as JSON`};
		return {value: clone(v)};
	}
	return {error: `unknown type ${t}`};
}

function create(options){
	options = options || {};
	let log = options.log || console;
	let state = {ready: false, raw: {}, schema: {}, values: {}, invalid: {}, problems: []};
	let listeners = [];
	let waiters = [];

	// Builds the merged schema and the typed values from the admin/settings data.
	function load(data){
		data = (data && typeof data == 'object') ? data : {};
		let schema = {}, problems = [], values = {}, invalid = {};
		Object.entries(CORE).forEach(([k, def])=>{ schema[k] = Object.assign({source: 'core'}, def); });
		let site = data.schema;
		if(site !== undefined && (site === null || typeof site != 'object' || Array.isArray(site)))
			problems.push(named('SCHEMA_INVALID', 'schema', 'admin/settings schema must be a map.'));
		else Object.entries(site || {}).forEach(([k, def])=>{
			if(CORE[k]) return problems.push(named('SCHEMA_CONFLICT', k, 'A site setting cannot reuse a core setting name.'));
			let p = checkDef(k, def);
			if(p.length) return problems.push(...p);
			schema[k] = Object.assign({source: 'site'}, def);
		});
		let stored = (data.values && typeof data.values == 'object' && !Array.isArray(data.values)) ? data.values : {};
		Object.entries(stored).forEach(([k, v])=>{
			let def = schema[k];
			if(!def) return problems.push(named('SETTING_UNKNOWN', k, 'Stored value has no definition (ignored).'));
			if(v === null || v === undefined) return;
			let r = coerce(def, v);
			if(r.error){
				invalid[k] = r.error;
				problems.push(named('SETTING_INVALID', k, r.error));
			}else values[k] = r.value;
		});
		Object.entries(schema).forEach(([k, def])=>{
			if(def.required && values[k] === undefined && def.default === undefined && !invalid[k])
				problems.push(named('SETTING_MISSING', k, 'Required setting has no value.'));
		});
		state = {ready: true, raw: data, schema, values, invalid, problems};
		problems.forEach(p=>log.warn && log.warn(`${p.code} ${p.name}`));
		waiters.splice(0).forEach(w=>w());
		listeners.forEach(fn=>{ try{ fn(data); }catch(e){ log.error && log.error('settings listener failed', e && e.message); } });
		return state;
	}

	function get(name){
		if(!state.ready) throw new SettingError('SETTINGS_NOT_READY', name, 'Settings are not loaded yet.');
		let def = state.schema[name];
		if(!def) throw new SettingError('SETTING_UNKNOWN', name, 'No such setting.');
		if(state.invalid[name]) throw new SettingError('SETTING_INVALID', name, state.invalid[name]);
		if(state.values[name] !== undefined) return clone(state.values[name]);
		if(def.default !== undefined) return clone(def.default);
		if(def.required) throw new SettingError('SETTING_MISSING', name, 'Required setting has no value.');
		return null;
	}

	// Values marked public (safe to put in the page); a broken one is left out and logged.
	function publicValues(){
		let out = {};
		Object.entries(state.schema).filter(([, d])=>d.public).forEach(([k])=>{
			try{ out[k] = get(k); }catch(e){ /* reported in problems */ }
		});
		return out;
	}

	// Validates a patch {key: value|null} from the admin page. null unsets a value.
	function validate(patch){
		let errors = [], clean = {};
		if(!patch || typeof patch != 'object' || Array.isArray(patch))
			return {errors: [named('SETTINGS_INVALID', 'values', 'values must be a map.')], values: {}};
		let keys = Object.keys(patch);
		if(!keys.length) errors.push(named('SETTINGS_INVALID', 'values', 'Nothing to save.'));
		if(keys.length > 200) errors.push(named('SETTINGS_INVALID', 'values', 'Too many settings in one save.'));
		keys.forEach(k=>{
			let def = state.schema[k];
			if(!def) return errors.push(named('SETTING_UNKNOWN', k, 'No such setting.'));
			let v = patch[k];
			if(v === null || v === undefined || v === ''){
				if(def.required && def.default === undefined) return errors.push(named('SETTING_MISSING', k, 'Required setting cannot be empty.'));
				return clean[k] = null;
			}
			let r = coerce(def, v);
			if(r.error) errors.push(named('SETTING_INVALID', k, r.error));
			else clean[k] = r.value;
		});
		return {errors, values: clean};
	}

	// What the admin page shows: definitions, stored values and problems. Settings only (no secrets live here).
	function describe(){
		let list = Object.entries(state.schema).map(([key, d])=>({
			key, type: d.type, label: d.label || key, group: d.group || 'Other', help: d.help || '',
			options: d.options, min: d.min, max: d.max, pattern: d.pattern, required: !!d.required,
			default: d.default, public: !!d.public, source: d.source,
			value: state.values[key] !== undefined ? clone(state.values[key]) : null,
			invalid: state.invalid[key] || null
		}));
		return {ready: state.ready, settings: list, problems: state.problems.slice(), meta: clone(state.raw.valuesMeta) || null};
	}

	// Writes a validated patch (db: a Firestore instance) and logs the changed names to admin/settings/log.
	function write({db, uid, patch}){
		if(!state.ready) return Promise.reject(new SettingError('SETTINGS_NOT_READY', 'values', 'Settings are not loaded yet.'));
		let {errors, values} = validate(patch);
		if(errors.length) return Promise.reject({status: 400, errors});
		let ref = db.doc(DOC);
		let keys = Object.keys(values).sort();
		return db.runTransaction(t=>t.get(ref).then(s=>{
			let cur = (s.exists && s.data().values) || {};
			let next = Object.assign({}, cur);
			keys.forEach(k=>{ if(values[k] === null) delete next[k]; else next[k] = values[k]; });
			let meta = {updatedBy: uid, updatedOn: new Date(), keys};
			// update replaces the whole values map (a merge would keep unset keys).
			if(s.exists) t.update(ref, {values: next, valuesMeta: meta});
			else t.set(ref, {values: next, valuesMeta: meta});
			t.set(db.collection(`${DOC}/log`).doc(), {at: new Date(), by: uid, keys, unset: keys.filter(k=>values[k] === null)});
		})).then(()=>({saved: keys}));
	}

	// A failed listen is logged by name, releases anyone waiting (pages render without settings
	// instead of hanging) and is retried every 30 seconds.
	let watching = false, failed = false;
	function watch(db){
		if(watching) return;
		watching = true;
		db.doc(DOC).onSnapshot(s=>{ failed = false; load(s.exists ? s.data() : {}); }, e=>{
			log.error && log.error('SETTINGS_WATCH_FAILED', e && e.message);
			failed = true;
			watching = false;
			waiters.splice(0).forEach(w=>w());
			let t = setTimeout(()=>watch(db), 30000);
			t.unref && t.unref();
		});
	}

	function ready(ms){
		if(state.ready) return Promise.resolve(true);
		if(failed) return Promise.resolve(false);
		return new Promise(res=>{
			let t = setTimeout(()=>res(false), ms || 5000);
			t.unref && t.unref();
			waiters.push(()=>{ clearTimeout(t); res(state.ready); });
		});
	}

	function onChange(fn){
		listeners.push(fn);
		if(state.ready) fn(state.raw);
	}

	return {load, get, publicValues, validate, describe, write, watch, ready, onChange, raw: ()=>state.raw, problems: ()=>state.problems.slice(), isReady: ()=>state.ready};
}

// Who may read and change settings in the admin page: root, admin.all or admin.settings
// (the same roles the Firestore rule for admin/settings allows).
function canManage(roles){
	if(!roles) return false;
	let root = roles.root, admin = roles.admin;
	return root === true || !!(root && root.all) || !!(admin && (admin.all === true || admin.settings === true));
}

let shared = null;
module.exports = {create, canManage, coerce, checkDef, SettingError, DOC, CORE, TYPES, get shared(){ return shared || (shared = create()); }};
