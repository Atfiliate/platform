var firebase	= require('firebase-admin');
var request		= require('request');
var http		= require('request-promise');
var cloudinary	= require('cloudinary');
var moment		= require('moment');
var mcache		= require('memory-cache');
let filecache	= {v:1.2};
let db			= false;
if(firebase.apps.length)
	db			= firebase.firestore();

if(process.env.cloudinaryName)
	cloudinary.config({
		cloud_name: process.env.cloudinaryName,
		api_key: process.env.cloudinaryKey,
		api_secret: process.env.cloudinaryToken
	});


Array.prototype._flat = Array.prototype.flat;
//fix because someone added a 'flat' to arrays in standards :S
Array.prototype.flat = function(path, placeholder){
	if(path)
		return this.map(function(i){
			let val = pathValue(i, path);
			return i ? placeholder ? val === null ? placeholder : val : val : null;
		})
	else
		return this._flat();
}
//Depricating getUnique. not sure where this is used outside of an old unique fn. which is no longer calling this.
Array.prototype.getUnique = function() {
	var u = {undefined:1},
		a = [];
	for (var i = 0, l = this.length; i < l; ++i) {
		if (u.hasOwnProperty(this[i]))
			continue;
		a.push(this[i]);
		u[this[i]] = 1;
	}
	return a;
}
Array.prototype.unique = function(path){
	var u = [],
		a = [];
    this.forEach(i=>{
        if(path){
            let val = pathValue(i, path);
            if(typeof val !== 'undefined' && !u.includes(val)){
                u.push(val);
                a.push(i)
            }
        }else{
            if(typeof i !== 'undefined' && !a.includes(i))
                a.push(i);
        }
    })
    return a;
}

Array.prototype.shuffle = function() {
	var i = this.length,
		j, temp;
	if (i == 0) return this;
	while (--i) {
		j = Math.floor(Math.random() * (i + 1));
		temp = this[i];
		this[i] = this[j];
		this[j] = temp;
	}
	return this;
}
Array.prototype.max = function() {
	return Math.max.apply(null, this);
};

Array.prototype.min = function() {
	return Math.min.apply(null, this);
};
Array.prototype.allKeys = function(){
	var keys = [];
	this.forEach(function(obj){
		if(typeof obj == 'object')
			Object.keys(obj).forEach(function(k){
				keys.push(k)
			})
	})
	return keys.unique();
}
String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}
String.prototype.toCamelCase = function() {
	var str = this.replace(/\s(.)/g, function($1) { return $1.toUpperCase(); })
		.replace(/\s/g, '')
		.replace(/^(.)/, function($1) { return $1.toLowerCase(); })
	return str.replace(/\W/g, '')
}
String.prototype.hashCode = function() {
	var hash = 0, i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};
String.prototype.compile = function(scope){
	let str = this;
	let parts = str.split('}}');
	return parts.map(p=>{
		let p2 = p.split('{{');
		if(p2[1])
			p2[1] = pathValue(scope, p2[1]) || '';
		return p2.join('');
	}).join('');
}

function pathValue(obj, path, val){
    let parts, attr;
	if(path[0] == '['){
        parts = path.split(']')
        attr = parts.shift().replace('[','');
        path = parts.join(']')
    }else{
    	parts = path.split('.');
        if(parts[0].includes('[')){
            path = parts.join('.')
            parts = path.split('[');
            attr = parts.shift();
            path = '['+parts.join('[')
        }else{
        	attr = parts.shift();
            path = parts.join('.')
        }
    }
    if(path[0] == '.')
        path = path.substring(1);
	if(val !== undefined){
		if(path.length){
			if(obj[attr]){
				pathValue(obj[attr], path, val)
			}else{
				obj[attr] = {};
				pathValue(obj[attr], path, val)
			}
		}else if(val == '_delete_' || val === null || val === ''){
			delete obj[attr];
		}else{
			 obj[attr] = val;
		}
	}else{
		if(attr)
			if(obj)
				return pathValue(obj[attr], path);
			else
				return null;
		else
			return obj;
	}
}

function isIsoDate(str) {
	if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) return false;
	var d = new Date(str);
	try{
		return d.toISOString()===str;
	}catch(e){
		return false;
	}
}
let Fire = function(path, cdg){
	var fire = this;
	fire._path = path;
	fire._parts = path.split('/');
	fire._cd = cdg || !!(fire._parts.length % 2) ? 'collection' : 'doc';
	fire._ref = db[fire._cd](fire._path);
	fire._qref = fire._ref;
	fire._clean = function(obj){ //clean is called when getting data from the DB for local use.
		if(obj){
			var keys = Object.keys(obj);
			if(keys.indexOf('_firestoreClient') == -1){
				keys.forEach(function(k){
					if(obj[k]){
						if(obj[k].toDate)
							obj[k] = obj[k].toDate();
						else if(obj[k].seconds)
							obj[k] = new Date(obj[k].seconds*1000);
						else if(obj[k]._seconds)
							obj[k] = new Date(obj[k]._seconds*1000);
						else if(typeof obj[k] == 'string' && isIsoDate(obj[k]))
							obj[k] = new Date(obj[k])
						else if(typeof obj[k] == 'object')
							obj[k] = fire._clean(obj[k])
					}
				})
			}
		}
		return obj;
	}
	fire._prepare = Fire.prepare;
	fire._become = function(ds){
		Fire.ct.read++;
		var data = ds.data();
		var d = (ds.exists ? fire._clean(data) : {});
		d.id = ds.id;
		d.$fire = {
			ref: ds.ref,
			save: function(){
				return new Promise((res, rej)=>{
					Fire.ct.write++;
					d.$status = 'saving';
					let copy = fire._prepare(d);
						copy.updatedOn = new Date();
					if(localStorage.debug)
						console.info('Save', {d, copy})
					d.$fire.ref.set(copy).then(function(r){
						d.$status = 'saved';
						res(r);
					}).catch(function(e){
						console.error(e);
						e.$error = e;
						d.$status = 'error';
						rej(e);
					})
				})
			},
			delete: function(){
				Fire.ct.write++;
				if(fire.list && !fire._listen){
					var idx = fire.list.indexOf(d);
					fire.list.splice(idx, 1);
				}
				return d.$fire.ref.delete();
			},
			update: function(attrObj){
				Fire.ct.write++;
				Object.keys(attrObj).forEach(function(k){
					if(attrObj[k] === undefined || attrObj[k] === null || attrObj[k] === '' || attrObj[k] === '_delete_'){
						attrObj[k] = firebase.firestore.FieldValue.delete();
						pathValue(d, k, '_delete_');
					}else{
						pathValue(d, k, attrObj[k]);
					}
				})
				attrObj.updatedOn = new Date();
				if(localStorage.debug)
					console.info('Update', {d, attrObj})
				return d.$fire.ref.update(attrObj);
			},
			listen: fire.listen,
			// function(check, callback){
			// 	//returns ignore function.
			// 	return d.$fire.ref.onSnapshot({includeMetadataChanges:false}, doc=>{
			// 		Fire.ct.read++;
			// 		let notify = (typeof check == 'function' ? check(doc) : true);
			// 		if(notify){
			// 			fire.obj = fire._become(doc);
			// 			callback && callback(fire.obj)
			// 		}
			// 	})
			// },
			doc: d,
			ds: ds
		}
		return d;
	}
	var options = ['where','orderBy','limit','startAt','startAfter','endAt'];
	options.forEach(o=>{
		fire[o] = function(...query){
			fire._qref = fire._qref[o](...query);
			return fire;
		}
	})
	fire.get = function(ref, force){
		ref = ref || fire._qref;
		return new Promise((res,rej)=>{
				
			try{
				if(fire._cd == 'collection' || fire._cd == 'collectionGroup'){
					if(fire.list && !force){
						res(fire.list);
					}else{
						ref.get()
						.then(function(qs){
							function List(){};
							List.prototype = new Array;
							List.prototype.$fire = fire;
							fire.list = new List();
							qs.forEach(doc=>{
								fire.list.push(fire._become(doc));
							})
							res(fire.list);
						}).catch(e=>{
							fire.$error = e;
							console.log(`There was a DB error: `, fire, ref);
							deferred.reject(e);
						})
					}
				}else{
					if(fire.obj)
						res(fire.obj);
					else{
						fire._qref.get().then(doc=>{
							fire.obj = fire._become(doc);
							res(fire.obj);
						}).catch(e=>{
							fire.$error = e;
							console.log(`There was a DB error: `, fire, ref);
							rej(e);
						})
					}
				}
			}catch(e){
				console.error(e);
				console.log(`There was a DB error: `, fire, ref);
			}
		})
	}
	fire.refresh = function(){
		return fire.get(null, true);
	}
	fire.add = function(item){
		if(item.id){
			return fire.set(item);
		}else{
			return new Promise((res, rej)=>{
				item.$status = 'saving';
				item.createdOn = new Date();
				item.updatedOn = new Date();
				item = fire._prepare(item);
	
				fire._ref.add(item).then(r=>{
					r.get().then(doc=>{
						var obj = fire._become(doc);
						obj.$status = 'saved';
						if(fire.list && !fire._listen)
							fire.list.push(obj);
						res(obj);
					})
				}).catch(e=>{
					item.$status = 'error';
					rej(e);
				})
			})
		}
	}
	fire.set = function(item){
		return new Promise((res, rej)=>{
			item.createdOn = item.createdOn || new Date();
			item.updatedOn = new Date();
			item.$status = 'saving';
			var id = item.id;
			delete item.id;
			let copy = fire._prepare(item);
			let ref =  fire._cd == 'doc' ? fire._ref : fire._ref.doc(id);
			ref.set(copy).then(r=>{
				ref.get().then(doc=>{
					var obj = fire._become(doc);
						obj.$status = 'saved';
					item.$status = 'saved';
					item.$dbv = obj;
					if(fire.list)
						fire.list.push(obj);
					res(obj);
				}).catch(e=>{
					rej({message: 'Set but could not get', e});
				});
			}).catch(e=>{
				rej({message: 'Could not set', e});
			})
		})
	}
	fire.update = function(attrObj){
		if(fire._cd == 'doc'){
			Fire.ct.write++;
			Object.keys(attrObj).forEach(function(k){
				if(attrObj[k] === undefined || attrObj[k] === null || attrObj[k] === '' || attrObj[k] === '_delete_'){
					attrObj[k] = firebase.firestore.FieldValue.delete();
				}
			})
			attrObj.updatedOn = new Date();
			return fire._ref.update(attrObj);
		}else{
			return Promise.reject('You can only update a docuemnt.');
		}
	}
}
Fire.prepare = function(obj){ //prepare is called with local data in prep to send to the DB
	if(obj && obj.constructor && obj.constructor.name==='Object'){
		obj = {...obj}
		Object.keys(obj).forEach(function(k){
			if(k.indexOf('$') != -1 || typeof obj[k] == 'undefined'){
				delete obj[k];
			}else if(Array.isArray(obj[k])){
				obj[k] = obj[k].map(Fire.prepare)
			}else if(typeof obj[k] == 'object'){
				obj[k] = Fire.prepare(obj[k])
			}
		})
	}
	return obj;
}
Fire.instances = [];
Fire.ct = {
	read: 0,
	write: 0
};

module.exports = {
	options: function(request, response){
		if(request.headers.origin){
			var headers = {};
			headers['Access-Control-Allow-Origin'] = request.headers.origin;
			headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS';
			headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Content-Length, X-Requested-With'
			response.writeHead(200, headers);
			response.end();
		}
	},
	startup: ()=>{
		if(db){
			console.log('STARTUP-F(N)S----------> ');
			var ref = firebase.database().ref('site/private/startupfns');
			ref.once('value', function(snapshot){
				snapshot.forEach(snap=>{
					let key = snap.key;
					let module = snap.val();
					try{
						var js; eval('js = '+module.code)
						if(js && js.init)
							js.init();
						else
							console.log(`JS had no init function: ${key}`);
					}catch(e){
						console.log(`Error running startup function: ${key}`);
					}
				})
			});
		}
	},

	cache: ()=>{
		if(db){
			const query = db.collection('dev');
			const observer = query.onSnapshot(qs => {
				qs.docChanges().forEach(change=>{
					let doc = change.doc.data();
						doc.id = change.doc.id;
						console.log(`Doc updated: ${doc.projectId} (${doc.id})`)
					let proj = pathValue(filecache, doc.projectId) || {default: null, snaps:{}};
						proj.snaps[doc.id] = doc;
						if(doc.stage == 'prod' && doc.default)
							proj.default = doc;
						pathValue(filecache, doc.projectId, proj);
				})
			}, err => {
				console.log(`Encountered error: ${err}`);
			});
		}
	},
	cloud: function(request, response){
		if(request.headers.origin){
			response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
			response.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
			response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Content-Length, X-Requested-With, X-Custom-Header')
		}

		var path = request.params.path;
		var code = mcache.get(path)
		if(code){
			try{
				var js; eval('js = '+code)
				if(js && js.init){
					js.init(request, response)
				}else{
					response.send('No path found.')
				}
			}catch(e){
				response.send(e);
			}
		}else{
			console.log('NOTFROMCACHE-cloud----------> '+request.params.path);
			var ref = firebase.database().ref('site/private/endpoints').child(request.params.path);
			ref.once('value', function(snapshot){
				var endpoint = snapshot.val() || '404 Not Found';
				var code = endpoint.code;
				if(process.env.cache)
					mcache.put(path, code, Number(process.env.cache));
				//we need to migrate endpoint code to be similar to the components
				//ie make this an object with code and other attributes instead of writing it directly.
				//until then, we are caching all endpoint code until server restart.
				try{
					var js; eval('js = '+code)
					if(js && js.init){
						js.init(request, response)
					}else{
						response.send('No path found.')
					}
				}catch(e){
					response.send(e);
				}
			});
		}
	},
	component: function(request, response){
		var path = request.params.path;
			path = path.split('.').join('_');

		if(request.headers.origin){
			response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
			response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
			response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Content-Length, X-Requested-With, X-Custom-Header')
		}

		if(path.indexOf('_js') != -1)
			response.setHeader("Content-Type", 'application/javascript');
		else if(path.indexOf('_css') != -1)
			response.setHeader("Content-Type", 'text/css');
		else if(path.indexOf('_json') != -1)
			response.setHeader("Content-Type", 'application/json');


		var cache = mcache.get(path)
		if(cache){
			console.log('From Cache: '+path);
			response.send(cache);
		}else{
			console.log('NOTFROMCACHE-component----------> '+path);
			var ref = firebase.database().ref('site/private/components').child(path);
			ref.once('value', function(snapshot){
				var component = snapshot.val();
				try{
					if(component.cache){
						mcache.put(path, component.code, Number(component.cache));
					}
					response.send(component.code)
				}catch(e){
					response.send(e);
				}
			});
		}
	},
	project: function(request, response){
		if(request.headers.origin){
			response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
			response.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
			response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Content-Length, X-Requested-With, X-Custom-Header')
		}
		if(request.params.root){
			request.params.component = request.params.root;
			request.params.projId = 'root';
		}
		
		if(firebase.apps.length === 0){
			response.send('Firebase Not Setup');
		}else if(request.params.component){
			var cid = request.params.component;

			let component;
			let proj = request.query.v ? pathValue(filecache, `${request.params.projId}.snaps.${request.query.v}`) : pathValue(filecache, `${request.params.projId}.default`);
			if(proj && proj.component)
				component = proj.component[cid];
			
			if(component){	
				if(cid.indexOf('_js') != -1 || cid.indexOf('.js') != -1)
					response.setHeader("Content-Type", 'application/javascript');
				else if(cid.indexOf('_css') != -1 || cid.indexOf('.css') != -1)
					response.setHeader("Content-Type", 'text/css');
				else if(cid.indexOf('_json') != -1 || cid.indexOf('.json') != -1)
					response.setHeader("Content-Type", 'application/json');
	
				try{
					response.send(component.code);
				}catch(e){
					response.send(e)
				}
			}else{
				response.send(`Component not found.`)
			}
		}else if(request.params.cloud){
			var cid = request.params.cloud;
			
			let cloud;
			let proj = request.query.v ? pathValue(filecache, `${request.params.projId}.snaps.${request.query.v}`) : pathValue(filecache, `${request.params.projId}.default`);
			if(proj && proj.cloud)
				cloud = proj.cloud[cid];

			if(cloud){
				try{
					let code = cloud.code || '';
					var js; eval('js = '+code);
					if(js && js.init){
						js.init(request, response)
					}else{
						response.send('Init not found.')
					}
				}catch(e){
					response.send(e)
				}
			}else{
				response.send('Cloud not found.')
			}
		}else{
			let proj, page;
			if(request.query.v && request.query.v != 'default' && request.query.v != 'undefined')
				proj = pathValue(filecache, `${request.params.projId}.snaps.${request.query.v}`);
			else
				proj = pathValue(filecache, `${request.params.projId}.default`);
			if(!proj){
				if(request.params.projId && request.query.v){
					console.log(`*********************************** REQUESTING ${request.query.v} FOR ${request.params.projId} FROM DB ***********************************************************`)
					console.log(Object.keys((pathValue(filecache, request.params.projId)||{})), Object.keys((pathValue(filecache, request.params.projId+'.snaps')||{})))
					db.collection('dev').doc(request.query.v).get().then(r=>{
						if(r.exists){
							proj = r.data();
							proj.id = r.id;
							page = proj.page = proj.page || {};
							page.vid = proj.id;
							response.send(page);
						}else{
							proj = pathValue(filecache, `${request.params.projId}.default`) || {};
							page = proj.page = proj.page || {id: `${request.params.projId}Default`};
							page.vid = proj.id;
							response.send(page);
						}
					})
				}else{
					response.send('Invalid URL');
				}
			}else{
				page = proj.page = proj.page || {};
				page.vid = proj.id;
				response.send(page);
			}
		}
	},
	package: function(request, response){
		db.doc('admin/settings').get().then(s=>{
			let settings = s.data();
			if(pathValue(settings, 'plan.id') == 'openSource'){
				let path = `project/${request.params.id}`;
				var ref = firebase.database().ref(path);
				ref.once('value', function(snap){
					var pkg = snap.val();
						response.send(pkg);
				})	
			}
		})
	}
}