// First install: idempotent installer with dry run, install log and rollback.
// Steps come from install/manifest.json. Every write is create-if-missing; nothing is ever overwritten.
// Responses list names and paths only, never env or data values.
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var manifest = require('../install/manifest.json');

const SITE_DIR = path.join(__dirname, '..', 'install', 'site');

function named(code, name, message){
	return {code, name, message};
}
function sha(s){
	return crypto.createHash('sha256').update(String(s)).digest('hex');
}
function safeEqual(a, b){
	a = Buffer.from(String(a || ''));
	b = Buffer.from(String(b || ''));
	return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function create({db, auth, env, now, readFile}){
	if(!db) throw new Error('installer: db is required');
	if(!auth) throw new Error('installer: auth is required');
	env = env || process.env;
	now = now || (()=>new Date());
	readFile = readFile || (f=>fs.readFileSync(path.join(SITE_DIR, f), 'utf8'));

	let parseConfig = ()=>{
		try{ return JSON.parse(env.config || ''); }catch(e){ return null; }
	};

	let missingEnv = ()=>manifest.env.required.filter(({name})=>env[name] === undefined || env[name] === '').map(({name})=>name);

	let sitePackage = ()=>{
		let pkg = JSON.parse(readFile('package.json'));
		let files = {cloud: {}, component: {}};
		Object.entries(pkg.cloud || {}).forEach(([name, file])=>files.cloud[name] = readFile(file));
		Object.entries(pkg.component || {}).forEach(([name, file])=>{
			if(file && file.generate == 'webManifest'){
				let cfg = parseConfig() || {};
				let title = String(cfg.title || 'Site');
				files.component[name] = JSON.stringify({name: title, short_name: title.slice(0, 12), start_url: '/', scope: '/', display: 'standalone'}, null, '\t') + '\n';
			}else{
				files.component[name] = readFile(file);
			}
		});
		return {pkg, files};
	};

	let siteDocs = ()=>db.collection('dev').where('projectId', '==', 'site').get().then(qs=>qs.docs || []);
	let exists = (p)=>db.doc(p).get().then(s=>!!s.exists);
	let rolesEmpty = ()=>db.collection('roles').limit(1).get().then(qs=>!(qs.docs && qs.docs.length));

	// Each step returns {id, action, path?, write?} where write() performs the create.
	let steps = (uid)=>{
		let byId = {};
		manifest.install.steps.forEach(s=>byId[s.id] = s);
		let out = [];
		let add = (id, fn)=>out.push(Promise.resolve().then(fn).then(r=>Object.assign({id, title: (byId[id] || {}).title || id}, r)));

		add('env', ()=>{
			let missing = missingEnv();
			return missing.length ? {action: 'manual', errors: missing.map(n=>named('MISSING_ENV', n, `Missing env: ${n}`))} : {action: 'none'};
		});
		add('settings', ()=>exists('admin/settings').then(ok=>ok ? {action: 'none'} : {
			action: 'create', path: 'admin/settings',
			data: ()=>({domain: String(env.origin || '').replace(/\/+$/, ''), subSite: {}, createdOn: now(), createdBy: uid})
		}));
		add('roles', ()=>rolesEmpty().then(empty=>empty ? {
			action: 'create', path: `roles/${uid}`,
			data: ()=>({root: true, createdOn: now(), createdBy: uid})
		} : {action: 'none'}));
		add('manageGroup', ()=>exists('acl/db/groups/manage').then(ok=>ok ? {action: 'none'} : {
			action: 'create', path: 'acl/db/groups/manage',
			data: ()=>({id: 'manage', title: 'Manage', createdOn: now(), createdBy: uid})
		}));
		add('commTemplates', ()=>db.collection('acl/db/groups/manage/data/role/comm/comm/templates').limit(1).get()
			.then(qs=>(qs.docs && qs.docs.length) ? {action: 'none'} : {action: 'manual'}));
		add('siteProject', ()=>siteDocs().then(docs=>{
			let {pkg, files} = sitePackage();
			let starred = docs.find(d=>{ let x = d.data(); return x.stage == 'prod' && x.default; });
			if(starred){
				let x = starred.data();
				let differs = [];
				['cloud', 'component'].forEach(kind=>Object.keys(files[kind]).forEach(name=>{
					let cur = x[kind] && x[kind][name] && x[kind][name].code;
					if(cur === undefined) differs.push(`${kind}.${name} (missing)`);
					else if(sha(cur) !== sha(files[kind][name])) differs.push(`${kind}.${name}`);
				}));
				return {action: 'none', path: `dev/${starred.id}`, differs};
			}
			let ref = db.collection('dev').doc();
			return {
				action: 'create', path: `dev/${ref.id}`,
				data: ()=>{
					let at = now();
					let entry = (id, code)=>({id, code, createdBy: uid, createdOn: at, state: {folds: [], scrollTop: 0, scrollLeft: 0}});
					let doc = {id: ref.id, projectId: pkg.projectId, stage: 'prod', default: true, versionId: crypto.randomBytes(16).toString('hex'),
						var: {title: pkg.title}, page: {vid: ref.id, title: pkg.projectId}, createdOn: at, updatedOn: at, cloud: {}, component: {}};
					Object.entries(files.cloud).forEach(([n, c])=>doc.cloud[n] = entry(n, c));
					Object.entries(files.component).forEach(([n, c])=>doc.component[n] = entry(n, c));
					return doc;
				}
			};
		}));
		add('products', ()=>({action: 'planned'}));
		return Promise.all(out);
	};

	let view = (list)=>list.map(s=>{
		let v = {id: s.id, title: s.title, action: s.action};
		if(s.path) v.path = s.path;
		if(s.differs && s.differs.length) v.differs = s.differs;
		if(s.errors) v.errors = s.errors;
		return v;
	});

	// dryRun (default): what would be created. Apply: requires confirm == 'apply'; stops before any write if env is incomplete.
	let apply = ({uid, dryRun = true, confirm})=>steps(uid).then(list=>{
		let creates = list.filter(s=>s.action == 'create');
		let envStep = list.find(s=>s.id == 'env');
		if(dryRun || confirm !== 'apply')
			return {dryRun: true, writes: 0, wouldCreate: creates.map(s=>s.path), manifestVersion: manifest.version, steps: view(list)};
		if(envStep.action != 'none')
			return Promise.reject({status: 409, error: named('ENV_INCOMPLETE', 'env', 'Set the required env names before installing.')});
		let created = [];
		let run = creates.reduce((p, s)=>p.then(()=>db.doc(s.path).create(s.data()).then(r=>{
			created.push({path: s.path, step: s.id});
		}, e=>{
			// Another writer created it in the meantime: leave it alone (idempotent), report it.
			if(e && (e.code == 6 || /already exists/i.test(e.message || ''))) s.action = 'none';
			else throw e;
		})), Promise.resolve());
		let logRef = db.collection('admin/install/log').doc();
		let finish = (error)=>logRef.set({at: now(), uid, manifestVersion: manifest.version, created, steps: view(list).map(s=>({id: s.id, action: s.action})), error: error ? (error.message || String(error)) : null})
			.then(()=>({dryRun: false, writes: created.length, created: created.map(c=>c.path), logId: logRef.id, manifestVersion: manifest.version, steps: view(list)}));
		return run.then(()=>finish(null), e=>finish(e).then(r=>Promise.reject({status: 500, error: named('INSTALL_FAILED', 'install', 'Install stopped; see the install log.'), logId: r.logId})));
	});

	// Deletes only docs that this log created and that were never changed since (updateTime == createTime).
	let rollback = ({logId, dryRun = true, confirm})=>db.doc(`admin/install/log/${logId}`).get().then(snap=>{
		if(!snap.exists) return Promise.reject({status: 404, error: named('LOG_NOT_FOUND', 'logId', 'Install log not found.')});
		let log = snap.data();
		return Promise.all((log.created || []).map(c=>db.doc(c.path).get().then(s=>{
			if(!s.exists) return {path: c.path, action: 'gone'};
			let unchanged = s.createTime && s.updateTime && s.createTime.isEqual ? s.createTime.isEqual(s.updateTime) : false;
			return {path: c.path, action: unchanged ? 'delete' : 'keep (changed since install)'};
		}))).then(items=>{
			if(dryRun || confirm !== 'rollback') return {dryRun: true, items};
			return items.filter(i=>i.action == 'delete').reduce((p, i)=>p.then(()=>db.doc(i.path).delete()), Promise.resolve())
				.then(()=>snap.ref.set({rolledBackOn: now()}, {merge: true}))
				.then(()=>({dryRun: false, items}));
		});
	});

	let isAllowed = (roles)=>{
		if(!roles) return false;
		return roles.root === true || !!(roles.root && roles.root.all) || !!(roles.admin && roles.admin.all);
	};

	// Root/admin.all; or, only while the roles collection is empty, a signed-in user with the env installKey.
	let authorize = (request)=>{
		let header = request.headers.authorization || '';
		let token = header.indexOf('Bearer ') == 0 ? header.slice(7) : '';
		if(!token)
			return Promise.reject({status: 401, error: named('AUTH_REQUIRED', 'authorization', 'Missing Bearer ID token.')});
		return auth().verifyIdToken(token).catch(()=>Promise.reject({status: 401, error: named('AUTH_INVALID', 'authorization', 'ID token is not valid.')}))
		.then(user=>db.doc(`roles/${user.uid}`).get().then(s=>{
			if(isAllowed(s.exists ? s.data() : null)) return user;
			return rolesEmpty().then(empty=>{
				if(empty && env.installKey && safeEqual(request.headers['x-install-key'], env.installKey)) return user;
				return Promise.reject({status: 403, error: named('FORBIDDEN', 'roles', 'Root or admin.all role required (or the install key on a site with no roles yet).')});
			});
		}));
	};

	let route = (fn)=>{
		let run = {apply, rollback}[fn];
		if(!run) throw new Error(`installer: unknown route ${fn}`);
		return (request, response)=>{
			response.setHeader('Cache-Control', 'no-store');
			let body = request.body || {};
			authorize(request).then(user=>run({uid: user.uid, logId: body.logId, dryRun: body.dryRun !== false, confirm: body.confirm}))
			.then(result=>response.json(result))
			.catch(e=>{
				let status = (e && e.status) || 500;
				let error = (e && e.error) || named('INSTALL_FAILED', fn, `Install route failed: ${fn}`);
				response.status(status).json({status: 'error', errors: [error], logId: e && e.logId});
			});
		};
	};

	return {apply, rollback, authorize, route, sitePackage};
}

module.exports = {create, manifest};
