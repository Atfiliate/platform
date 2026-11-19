// /__core/settings: the admin page reads and saves site settings here, so every save is
// validated against the schema on the server. Root, admin.all or admin.settings only
// (Bearer ID token). Responses hold settings only; secrets are env and never appear here.
const {canManage} = require('./settings.js');

function named(code, name, message){
	return {code, name, message};
}

function create({settings, auth, getRoles, db}){
	let requireManager = (request)=>{
		let header = String(request.headers.authorization || '');
		let token = header.indexOf('Bearer ') == 0 ? header.slice(7) : '';
		if(!token) return Promise.reject({status: 401, errors: [named('AUTH_REQUIRED', 'authorization', 'Missing Bearer ID token.')]});
		return Promise.resolve().then(()=>auth().verifyIdToken(token)).catch(()=>Promise.reject({status: 401, errors: [named('AUTH_INVALID', 'authorization', 'ID token is not valid.')]}))
			.then(user=>getRoles(user.uid).then(roles=>{
				if(!canManage(roles)) return Promise.reject({status: 403, errors: [named('FORBIDDEN', 'roles', 'Root, admin.all or admin.settings role required.')]});
				return user;
			}));
	};
	let fail = (response, e)=>{
		if(e && e.errors) return response.status(e.status || 400).json({status: 'error', errors: e.errors});
		if(e && e.code && e.setting) return response.status(503).json({status: 'error', errors: [named(e.code, e.setting, e.message)]});
		console.log('SETTINGS_ROUTE_FAILED', e && e.message);
		response.status(500).json({status: 'error', errors: [named('SETTINGS_FAILED', 'settings', 'Settings request failed.')]});
	};
	let read = (request, response)=>{
		response.setHeader('Cache-Control', 'no-store');
		requireManager(request).then(()=>settings.ready()).then(()=>response.json(Object.assign({status: 'ok'}, settings.describe()))).catch(e=>fail(response, e));
	};
	let save = (request, response)=>{
		response.setHeader('Cache-Control', 'no-store');
		requireManager(request).then(user=>settings.ready().then(()=>settings.write({db: db(), uid: user.uid, patch: (request.body || {}).values})))
			.then(r=>response.json({status: 'ok', saved: r.saved})).catch(e=>fail(response, e));
	};
	return {read, save, requireManager};
}

module.exports = {create};
