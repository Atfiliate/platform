// Who may run a cloud handler from a ?v= version.
// Public: the starred version and any version with stage 'prod' (published).
// Developers only: every other version (stage 'dev' and the like). A developer sends
// an ID token as `Authorization: Bearer <token>` (or body.jwt) and has roles/{uid}
// developer.<projectId>, developer.all or root.

function named(code, name, message){
	return {code, name, message};
}

// version: the requested version; starred: the project's starred version (or null).
function versionAccess(version, starred){
	if(!version) return 'public';
	if(starred && version.id && starred.id == version.id) return 'public';
	if(version.default === true || version.stage == 'prod') return 'public';
	return 'developer';
}

function isDeveloper(roles, projectId){
	if(!roles) return false;
	let root = roles.root, dev = roles.developer;
	if(root === true || !!(root && root.all)) return true;
	if(!dev || typeof dev != 'object') return false;
	return dev.all === true || (!!projectId && dev[projectId] === true);
}

function tokenOf(request){
	let header = String((request.headers && request.headers.authorization) || '');
	if(header.indexOf('Bearer ') == 0) return header.slice(7);
	let body = request.body || {};
	return typeof body.jwt == 'string' ? body.jwt : '';
}

// auth: ()=>getAuth(); getRoles: uid=>Promise<roles|null>
function create({auth, getRoles}){
	let requireDeveloper = (request, projectId)=>{
		let token = tokenOf(request);
		if(!token)
			return Promise.reject({status: 401, error: named('DEVELOPER_REQUIRED', 'authorization', 'This version is not published. Send a developer ID token.')});
		return Promise.resolve().then(()=>auth().verifyIdToken(token)).catch(()=>{
			return Promise.reject({status: 401, error: named('AUTH_INVALID', 'authorization', 'ID token is not valid.')});
		}).then(user=>Promise.resolve(getRoles(user.uid)).then(roles=>{
			if(!isDeveloper(roles, projectId))
				return Promise.reject({status: 403, error: named('FORBIDDEN', 'roles', `developer.${projectId} role required.`)});
			return user;
		}));
	};
	return {requireDeveloper};
}

// Project and version ids: Firestore-safe doc ids only. Reserved ids (__name__) and any other
// character (., /, spaces, and so on) are refused before the cache or Firestore is read.
function validId(v){
	return typeof v == 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v) && !/^__.*__$/.test(v);
}

module.exports = {versionAccess, isDeveloper, tokenOf, create, named, validId};
