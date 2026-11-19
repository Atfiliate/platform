// Phase 0: root/admin-only health check and dry-run install plan.
// Read-only. Responses list NAMES only, never env or data values.
var manifest = require('../install/manifest.json');

const CHECK_MS = 8000; // Fire.get() can hang on a DB error (deferred is undefined in its catch), so every check is time-boxed.

function named(code, name, message){
	return {code, name, message};
}
function hasPath(obj, path){
	return path.split('.').every(p=>{
		if(obj === null || typeof obj !== 'object' || obj[p] === undefined || obj[p] === '')
			return false;
		obj = obj[p];
		return true;
	});
}
function timeout(promise, name){
	return Promise.race([
		promise,
		new Promise((res, rej)=>{
			let t = setTimeout(()=>rej(named('CHECK_TIMEOUT', name, `Check timed out: ${name}`)), CHECK_MS);
			t.unref && t.unref();
		})
	]);
}

function create({Fire, auth, env, settings, studio, sites, siteConfig}){
	if(!Fire) throw new Error('health: Fire is required');
	if(!auth) throw new Error('health: auth is required');
	env = env || process.env;

	let checkEnv = ()=>{
		let errors = [], present = [];
		// systemEmail is env only while configSource is env (settings mode: the systemEmail setting).
		let envMode = !siteConfig || siteConfig.mode() == 'env';
		manifest.env.required.concat(envMode ? (manifest.env.envModeOnly || []) : []).forEach(({name})=>{
			if(env[name] === undefined || env[name] === '')
				errors.push(named('MISSING_ENV', name, `Missing env: ${name}`));
			else
				present.push(name);
		});
		let optionalMissing = manifest.env.optional.filter(({name})=>env[name] === undefined || env[name] === '').map(({name})=>name);
		[['config', manifest.env.configKeys], ['googleJson', []]].forEach(([name, keys])=>{
			if(!env[name]) return;
			let parsed;
			try{
				parsed = JSON.parse(env[name]);
			}catch(e){
				return errors.push(named('INVALID_ENV', name, `Invalid JSON in env: ${name}`));
			}
			keys.forEach(k=>{
				if(!hasPath(parsed, k))
					errors.push(named('MISSING_CONFIG', `${name}.${k}`, `Missing env key: ${name}.${k}`));
			});
		});
		return {errors, warnings: [], present, optionalMissing};
	};

	let checkItem = (item)=>{
		let run = Promise.resolve().then(()=>runItem(item));
		return timeout(run, item.id).catch(e=>{
			let error = (e && e.code == 'CHECK_TIMEOUT') ? e : named('CHECK_FAILED', item.id, `Check failed: ${item.id}`);
			return {ok: false, error};
		});
	};

	let runItem = (item)=>{
		let run;
		if(item.kind == 'doc'){
			run = new Fire(item.path).get().then($doc=>{
				let exists = !!($doc && $doc.$fire && $doc.$fire.ds && $doc.$fire.ds.exists);
				if(!exists)
					return {ok: false, error: named('MISSING_DOC', item.path, `Missing doc: ${item.path}`)};
				let missingFields = (item.recommendedFields || []).filter(f=>!hasPath($doc, f));
				return {ok: true, warnings: missingFields.map(f=>named('MISSING_FIELD', `${item.path}.${f}`, `Recommended field missing: ${item.path}.${f}`))};
			});
		}else{
			let fire = new Fire(item.path);
			(item.where || []).forEach(w=>fire.where(...w));
			run = fire.limit(1).get().then(list=>{
				if(!list || !list.length)
					return {ok: false, error: named('EMPTY_COLLECTION', item.path, `No docs in: ${item.path}`)};
				return {ok: true, warnings: []};
			});
		}
		return run;
	};

	let checkData = ()=>{
		return Promise.all(manifest.data.map(item=>checkItem(item).then(r=>Object.assign({id: item.id, required: !!item.required}, r))));
	};

	let health = ()=>{
		let envResult = checkEnv();
		return checkData().then(data=>{
			let errors = envResult.errors.slice();
			let warnings = envResult.warnings.slice();
			data.forEach(d=>{
				if(!d.ok && d.required) errors.push(d.error);
				if(!d.ok && !d.required) warnings.push(d.error);
				(d.warnings || []).forEach(w=>warnings.push(w));
			});
			// Site settings (admin/settings values): names and codes only.
			if(settings){
				if(!settings.isReady()) warnings.push(named('SETTINGS_NOT_READY', 'admin/settings', 'Settings are not loaded yet.'));
				settings.problems().forEach(p=>{
					let item = named(p.code, p.name, p.message);
					(p.code == 'SETTING_UNKNOWN' ? warnings : errors).push(item);
				});
			}
			// Studio settings (admin/studio) and sub-sites (admin/settings/sites): names and codes only.
			if(studio){
				if(!studio.isReady()) warnings.push(named('SETTINGS_NOT_READY', 'admin/studio', 'Studio settings are not loaded yet.'));
				studio.problems().forEach(p=>(p.code == 'SETTING_UNKNOWN' ? warnings : errors).push(named(p.code, `studio.${p.name}`, p.message)));
			}
			if(sites) sites.problems().forEach(p=>warnings.push(named(p.code, `sites.${p.name}`, p.message)));
			if(siteConfig){
				let c = siteConfig.problems();
				c.errors.forEach(e=>errors.push(e));
				c.warnings.forEach(w=>warnings.push(w));
			}
			return {
				status: errors.length ? 'error' : 'ok',
				manifestVersion: manifest.version,
				configSource: siteConfig ? siteConfig.mode() : 'env',
				env: {present: envResult.present, optionalMissing: envResult.optionalMissing},
				data: data.map(d=>({id: d.id, ok: d.ok})),
				errors,
				warnings
			};
		});
	};

	let plan = ()=>{
		let envResult = checkEnv();
		return checkData().then(data=>{
			let byId = {};
			data.forEach(d=>byId[d.id] = d);
			let steps = manifest.install.steps.map(step=>{
				let done;
				if(step.check == 'env')
					done = envResult.errors.length == 0;
				else if(step.check)
					done = !!(byId[step.check] && byId[step.check].ok);
				let action = step.type == 'planned' ? 'planned'
					: done ? 'none'
					: step.type == 'manual' ? 'manual'
					: 'wouldCreate';
				return {id: step.id, title: step.title, type: step.type, action, phase: step.phase || 0};
			});
			return {dryRun: true, writes: 0, manifestVersion: manifest.version, steps};
		});
	};

	let isAllowed = (roles)=>{
		if(!roles) return false;
		let root = roles.root;
		let admin = roles.admin;
		return root === true || !!(root && root.all) || !!(admin && admin.all);
	};

	let requireRoot = (request)=>{
		let header = request.headers.authorization || '';
		let token = header.indexOf('Bearer ') == 0 ? header.slice(7) : '';
		if(!token)
			return Promise.reject({status: 401, error: named('AUTH_REQUIRED', 'authorization', 'Missing Bearer ID token.')});
		return auth().verifyIdToken(token).catch(()=>{
			return Promise.reject({status: 401, error: named('AUTH_INVALID', 'authorization', 'ID token is not valid.')});
		}).then(user=>{
			return new Fire(`roles/${user.uid}`).get().then($roles=>{
				if(!isAllowed($roles))
					return Promise.reject({status: 403, error: named('FORBIDDEN', 'roles', 'Root or admin.all role required.')});
				return user;
			});
		});
	};

	let route = (fn)=>{
		let run = {health, plan}[fn];
		if(!run) throw new Error(`health: unknown route ${fn}`);
		return (request, response)=>{
			response.setHeader('Cache-Control', 'no-store');
			requireRoot(request).then(()=>run()).then(result=>{
				response.json(result);
			}).catch(e=>{
				let status = (e && e.status) || 500;
				let error = (e && e.error) || named('HEALTH_FAILED', fn, `Health route failed: ${fn}`);
				response.status(status).json({status: 'error', errors: [error]});
			});
		};
	};

	return {health, plan, route, checkEnv, isAllowed};
}

module.exports = {create, manifest};
