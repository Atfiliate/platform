// /__core/settings: the admin page reads and saves settings here, so every save is validated
// against the schema on the server and logged (names only) to admin/settings/log.
//   ?scope=site    admin/settings values          root, admin.all or admin.settings
//   ?scope=studio  admin/studio values            root, admin.all or admin.studio
//   ?scope=sites   admin/settings/sites/{host}    root, admin.all or admin.settings
// Bearer ID token. Responses hold settings only; secrets are env and never appear here.
const {canManage} = require('./settings.js');

function named(code, name, message){
	return {code, name, message};
}
const SCOPES = ['site', 'studio', 'sites'];

function create({settings, studio, sites, auth, getRoles, db}){
	let scopeOf = request=>{
		let s = String((request.query && request.query.scope) || 'site');
		if(!SCOPES.includes(s) || (s == 'studio' && !studio) || (s == 'sites' && !sites))
			throw {status: 400, errors: [named('SCOPE_INVALID', 'scope', `scope must be one of: ${SCOPES.join(', ')}.`)]};
		return s;
	};
	let requireManager = (request, scope)=>{
		let header = String(request.headers.authorization || '');
		let token = header.indexOf('Bearer ') == 0 ? header.slice(7) : '';
		if(!token) return Promise.reject({status: 401, errors: [named('AUTH_REQUIRED', 'authorization', 'Missing Bearer ID token.')]});
		return Promise.resolve().then(()=>auth().verifyIdToken(token)).catch(()=>Promise.reject({status: 401, errors: [named('AUTH_INVALID', 'authorization', 'ID token is not valid.')]}))
			.then(user=>getRoles(user.uid).then(roles=>{
				if(!canManage(roles, scope)) return Promise.reject({status: 403, errors: [named('FORBIDDEN', 'roles', scope == 'studio' ? 'Root, admin.all or admin.studio role required.' : 'Root, admin.all or admin.settings role required.')]});
				return user;
			}));
	};
	let fail = (response, e)=>{
		if(e && e.errors) return response.status(e.status || 400).json({status: 'error', errors: e.errors});
		if(e && e.code && e.setting) return response.status(503).json({status: 'error', errors: [named(e.code, e.setting, e.message)]});
		console.log('SETTINGS_ROUTE_FAILED', e && e.message);
		response.status(500).json({status: 'error', errors: [named('SETTINGS_FAILED', 'settings', 'Settings request failed.')]});
	};
	let target = scope=>scope == 'studio' ? studio : settings;
	let read = (request, response)=>{
		response.setHeader('Cache-Control', 'no-store');
		let scope;
		try{ scope = scopeOf(request); }catch(e){ return fail(response, e); }
		requireManager(request, scope).then(()=>settings.ready()).then(()=>{
			if(scope == 'sites'){
				// Override definitions come along so the page can build the sub-site form.
				let d = sites.describe();
				d.settings = settings.describe().settings.filter(s=>s.override);
				return response.json(Object.assign({status: 'ok', scope}, d));
			}
			return target(scope).ready().then(()=>response.json(Object.assign({status: 'ok'}, target(scope).describe())));
		}).catch(e=>fail(response, e));
	};
	let save = (request, response)=>{
		response.setHeader('Cache-Control', 'no-store');
		let scope;
		try{ scope = scopeOf(request); }catch(e){ return fail(response, e); }
		let body = request.body || {};
		requireManager(request, scope).then(user=>settings.ready().then(()=>{
			if(scope == 'sites') return sites.write({db: db(), uid: user.uid, host: body.host, patch: body.site}).then(r=>({site: r}));
			return target(scope).ready().then(()=>target(scope).write({db: db(), uid: user.uid, patch: body.values})).then(r=>({saved: r.saved}));
		})).then(r=>response.json(Object.assign({status: 'ok', scope}, r))).catch(e=>fail(response, e));
	};
	return {read, save, requireManager};
}

module.exports = {create, SCOPES};
