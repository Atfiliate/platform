/*
	global app, angular, Stripe, firebase, cloudinary, gapi
*/
app.factory('config', function(){
	//whois from app.js loads config data and stores it in localStorage.
	//config gets infomration and distributes it when necessary.
	let config = localStorage.getItem('whois') || '{}';
	config = JSON.parse(config);
	firebase.initializeApp(config.firebase);
	if(config.fire && config.fire.messagingKey){
		try{
			let messaging = firebase.messaging();
			messaging.usePublicVapidKey(config.fire.messagingKey);
		}catch(e){
			console.info(e)
		}
	}
	return config;
})

app.factory('Fire', function($q){
	let db = firebase.firestore();

	let _config = {prefix: ''}
	function isIsoDate(str) {
		if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) return false;
		var d = new Date(str);
		try{
			return d.toISOString()===str;
		}catch(e){
			return false;
		}
	}
	var Fire = window.Fire = function(path, cdg){
		if(localStorage.debug)
			Fire.instances.push(this);
		var fire = this;
		fire._path = _config.prefix+path;
		fire._parts = path.split('/');
		fire._cd = cdg || !!(fire._parts.length % 2) ? 'collection' : 'doc';
		fire._ref = db[fire._cd](fire._path);
		fire._qref = fire._ref;
		fire._clean = function(obj){
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
		fire._prepare = function(obj){
			if(obj){
				Object.keys(obj).forEach(function(k){
					if(k.indexOf('$') != -1 || typeof obj[k] == 'undefined'){
						delete obj[k];
					}else if(Array.isArray(obj[k])){
						obj[k] = obj[k].map(fire._prepare)
					}else if(typeof obj[k] == 'object'){
						obj[k] = fire._prepare(obj[k])
					}
				})
			}
			return obj;
		}
		fire._become = function(ds){
			Fire.ct.read++;
			var data = ds.data();
			var d = (ds.exists ? fire._clean(data) : {});
			d.id = ds.id;
			d.$fire = {
				ref: ds.ref,
				save: function(){
					Fire.ct.write++;
					d.$status = 'saving';
					let $fire = d.$fire;
					delete d.$fire;
					let copy = angular.copy(d);
					d.$fire = $fire;
					copy = fire._prepare(copy);
					copy.updatedOn = new Date();
					return d.$fire.ref.set(copy).then(function(r){
						d.$status = 'saved';
					}).catch(function(e){
						console.error(e);
						e.$error = e;
						d.$status = 'error';
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
						d[k] = attrObj[k];
					})
					attrObj.updatedOn = new Date();
					return d.$fire.ref.update(attrObj);
				},
				listen: function(check, callback){
					//returns ignore function.
					return d.$fire.ref.onSnapshot({includeMetadataChanges:false}, doc=>{
						Fire.ct.read++;
						let notify = (typeof check == 'function' ? check(doc) : true);
						if(notify){
							fire.obj = fire._become(doc);
							callback && callback(fire.obj)
						}
					})
				},
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
			var deferred = $q.defer();
			if(fire._cd == 'collection' || fire._cd == 'collectionGroup'){
				if(fire.list && !force){
					deferred.resolve(fire.list);
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
						deferred.resolve(fire.list);
					}).catch(e=>{
						deferred.reject(e);
					})
				}
			}else{
				if(fire.obj)
					deferred.resolve(fire.obj);
				else{
					fire._qref.get().then(doc=>{
						fire.obj = fire._become(doc);
						deferred.resolve(fire.obj);
					}).catch(e=>{
						deferred.reject(e);
					})
				}
			}
			return deferred.promise;
		}
		fire.refresh = function(){
			return fire.get(null, true);
		}
		fire.listen = function(check, callback){
			fire._listen = callback;
			let checkFn = (change)=>{
				return new Promise((res,rej)=>{
					if(change.doc.metadata.hasPendingWrites || change.doc.metadata.fromCache)
						rej();
					else
						res();
				})
			};
			if(fire._cd == 'collection'){
				fire._ignore = fire._qref.onSnapshot({includeMetadataChanges:false}, snap=>{
					var promises = [];
					snap.docChanges().forEach(change=>{
						check = check || checkFn;
						promises.push(check(change).then(r=>{
							if(fire.list){
								if(change.type === 'added'){
									var doc = change.doc;
									var odoc = fire.list.find(d=>d.id==change.doc.id);
									if(!odoc)
										fire.list.push(fire._become(doc));
								}else if(change.type === 'modified'){
									Fire.ct.read++;
									var data = change.doc.data();
									var obj = fire._clean(data);
									var odoc = fire.list.find(d=>d.id==change.doc.id);
									Object.keys(obj).forEach(k=>{
										odoc[k] = obj[k];
									})
								}else if(change.type === 'removed'){
									var idx = fire.list.findIndex(d=>d.id==change.doc.id);
									fire.list.splice(idx, 1);
								}
							}
						}))
					})
					Promise.all(promises).then(()=>{ //Checks are done on individual documents.  If any fail, don't callback
						fire._listen && fire._listen(fire.list);
					}).catch(e=>{
						//do nothing
					})
				})
			}else{
				fire._ignore = fire._qref.onSnapshot(doc=>{
					check = check || checkFn;
					check(doc).then(r=>{ //documents only perform callback if check passes
						fire.obj = fire._become(doc);
						fire._listen && fire._listen(fire.obj)
					}).catch(e=>{
						//do nothing
					})
				})
			}
		}
		fire.add = function(item){
			var deferred = $q.defer();
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
					deferred.resolve(obj);
				}).catch(e=>{
					deferred.reject(e);
				})
			}).catch(e=>{
				item.$status = 'error';
				deferred.reject(e);
			})
			return deferred.promise;
		}
		fire.set = function(item){
			var deferred = $q.defer();
			item.createdOn = new Date();
			item.updatedOn = new Date();
			item.$status = 'saving';
			var id = item.id;
			delete item.id;
			item = fire._prepare(item);
			fire._ref.doc(id).set(item).then(r=>{
				fire._ref.doc(id).get().then(doc=>{
					var obj = fire._become(doc);
						obj.$status = 'saved';
					if(fire.list)
						fire.list.push(obj);
					deferred.resolve(obj);
				}).catch(e=>{
					deferred.reject(e);
				})
			})
			return deferred.promise;
		}
	}
	if(localStorage.debug)
		console.info('Debug enabled: delete localStorage.debug')
	Fire.instances = [];
	Fire.ct = {
		read: 0,
		write: 0
	};
	Fire.config = function(config){
		if(config)
			_config = Object.assign(_config, config);
		return _config;
	}
	Fire.legacy = function(path, cd){
		var fire = this;
		fire._path = path;
		fire._parts = path.split('/');
		fire._cd = cd || (!!(fire._parts.length % 2) ? 'collection' : 'doc');
		fire._ref = firebase.database().ref(fire._path);
		fire._qref = fire._ref;
		fire._cleanForDb = (obj)=>{
			if(obj){
				var keys = Object.keys(obj);
				keys.forEach(k=>{
					if(obj[k]){
						if(k.indexOf('$') != -1)
							delete obj[k]
						else if(obj[k].toISOString)
							obj[k] = obj[k].toISOString();
						else if(typeof obj[k] == 'object')
							obj[k] = fire._cleanForDb(obj[k])
					}
				})
			}
			return obj;
		}
		fire._become = function(doc){
			var d = doc.exists() ? doc.val() : {};
			d.id = doc.key;
			d.$fire = {
				ref: doc.ref,
				save: function(){
					var copy = angular.copy(d);
						copy = fire._cleanForDb(copy);
					delete copy.id;
					return d.$fire.ref.set(copy);
				},
				delete: function(){
					if(fire.list){
						var idx = fire.list.indexOf(d);
						fire.list.splice(idx, 1);
					}
					return d.$fire.ref.remove();
				},
				update: function(attrObj){
					Object.keys(attrObj).forEach(k=>{
						d[k] = attrObj[k];
					})
					return d.$fire.ref.update(attrObj);
				},
				listen: fire.listen
			}
			return d;
		}
		var options = ['orderByChild','equalTo','limitToFirst','limitToLast','startAt','endAt'];
		options.forEach(o=>{
			fire[o] = function(...query){
				fire._qref = fire._qref[o](...query);
				return fire;
			}
		})
		fire.get = function(ref, force){
			ref = ref || fire._qref;
			var deferred = $q.defer();
			if(fire._cd == 'collection'){
				if(fire.list && !force){
					deferred.resolve(fire.list);
				}else{
					ref.once('value')
					.then(function(qs){
						function List(){};
						List.prototype = new Array;
						List.prototype.$fire = fire;
						fire.list = new List();
						qs.forEach(doc=>{
							fire.list.push(fire._become(doc));
						})
						deferred.resolve(fire.list);
					}).catch(e=>{
						deferred.reject(e);
					})
				}
			}else{
				if(fire.obj)
					deferred.resolve(fire.obj);
				else{
					fire._qref.once('value').then(doc=>{
						fire.obj = fire._become(doc);
						deferred.resolve(fire.obj);
					}).catch(e=>{
						deferred.reject(e);
					})
				}
			}
			return deferred.promise;
		}
		fire.refresh = function(){
			return fire.get(null, true);
		}
		fire.listen = function(check, callback){
			//setup listener and trigger callback on data-change.
			let sync = data=>{
				Object.keys(data).forEach(k=>{
					fire.obj[k] = data[k]
				})
				callback && callback(fire._obj);
			}
			fire._ref.on('value', snap=>{
				let data = snap.val();
				if(check){
					check().then(r=>{
						sync(data);
					})
				}else{
					sync(data)
				}
			})
		}
		fire.add = function(item){
			var deferred = $q.defer();
			item.createdOn = new Date();
			let copy = angular.copy(item);
			copy = fire._cleanForDb(copy);
			var newItemRef = fire._ref.push();
			newItemRef.set(copy);
			newItemRef.once('value', function(snap) {
				var obj = fire._become(snap);
				if(fire.list)
					fire.list.push(obj);
				deferred.resolve(obj);
			});
			return deferred.promise;
		}
		fire.set = function(item){
			var deferred = $q.defer();
			item.createdOn = new Date();
			var id = item.id;
			let copy = angular.copy(item);
			copy = fire._cleanForDb(copy);
			delete copy.id;
			fire._ref.child(id).set(copy).then(r=>{
				fire._ref.child(id).once('value').then(doc=>{
					var obj = fire._become(doc);
					if(fire.list)
						fire.list.push(obj);
					deferred.resolve(obj);
				}).catch(e=>{
					deferred.reject(e);
				})
			})
			return deferred.promise;
		}
	}
	return Fire;
})
// fire.get(ref=>{
// 	ref.where('','','')
// 	return ref;
// })
app.factory('Stripe', function($q, $http, $mdDialog, Auth, config){
	if(window.Stripe)
		Stripe.setPublishableKey(config.stripe);
	return {
		checkout: function(cart, event){
			//cart: {title:'', description:'', amount:''}
			var deferred = $q.defer();
			var options = {
				controller: 'StripeCtrl',
				templateUrl: '/component/stripe.html',
				clickOutsideToClose: true,
				locals: {
					view: 'checkout',
					cart: cart
				}
			}
			if(event)
				options.targetEvent = event;
				
			$mdDialog.show(options).then(function(r){
				deferred.resolve(r);
			})
			return deferred.promise;
		},
		manage: function(event){
			var deferred = $q.defer();
			var options = {
				controller: 'StripeCtrl',
				templateUrl: '/component/stripe.html',
				clickOutsideToClose: true,
				locals: {
					view: 'manage'
				}
			}
			if(event)
				options.targetEvent = event;
				
			$mdDialog.show(options).then(function(r){
				deferred.resolve(r);
			})
			return deferred.promise;
		}
	}
})
app.factory('Auth', function($q, $firebaseAuth, $firebaseObject, Fire){
	var signin = $q.defer();
	var authState = $q.defer();
	$firebaseAuth().$onAuthStateChanged(function(user){
		if(user){
			new Fire(`roles/${user.uid}`).get().then(r=>{
				user.roles = r;
				user.is = (role)=>{ //can pass 'role.subRole'
					return pathValue(user.roles, role);
				}
				user.jwt = function(){
					return firebase.auth().currentUser.getToken(true)
				}
				signin.resolve(user)
				authState.resolve(user)
			})
			// var ref = firebase.database().ref().child('site/public/roles').child(user.uid);
			// var obj = $firebaseObject(ref);
			// obj.$loaded().then(function(){
			// 	user.roles = obj || {};
			// 	user.flatRoles = Object.keys(user.roles).filter(function(r){return r.indexOf('$')==-1})
			// 	user.is = function(role){
			// 		if(role && role.slice(0,1) == '!'){
			// 			role = role.slice(1);
			// 			return role=='any' ? !user.flatRoles.length : !user.roles[role];
			// 		}else{
			// 			return !role || role=='all' || (role=='any' && user.flatRoles.length) || !!user.roles[role];
			// 		}
			// 	}
			// 	user.jwt = function(){
			// 		return firebase.auth().currentUser.getToken(true)
			// 	}
			// 	signin.resolve(user)
			// 	authState.resolve(user)
			// });
		}else{
			authState.reject()
		}
	})
	
	return function(resolveOnLogin){
		if(resolveOnLogin)
			return signin.promise;
		else
			return authState.promise;
	}
})
app.factory('Google', function($q, $http, config){
	var G = this;
		G.scopes = [];
		G.credentials = null;

	var tools = {
		auth: function(scopes){
			var google = $q.defer()
			function client(){
				var deferred = $q.defer()
				if(gapi.client){
					gapi.client.setApiKey(config.firebase.apiKey)
					deferred.resolve(gapi)
				}else{
					gapi.load('client', function(){
						gapi.client.setApiKey(config.firebase.apiKey)
						deferred.resolve(gapi)
					})
				}
				return deferred.promise;
			}
			function scopeUpdate(scopes){
				var change = false;
				if(typeof(scopes) == 'string')
					scopes = [scopes]
				else
					scopes = scopes || [];
				scopes.forEach(function(scope){
					if(G.scopes.indexOf(scope) == -1){
						G.scopes.push(scope)
						change = true;
					}
				})
				return change;
			}
			
			if(scopeUpdate(scopes) || !G.credentials){
				
				$q.all([client()]).then(function(){
					gapi.auth.authorize({
						client_id: config.client_id,
						scope: G.scopes.join(' ')
					}).then(function(r){
						G.credentials = r;
						$http.defaults.headers.common.Authorization = 'Bearer '+G.credentials.access_token;
						$http.defaults.headers.common['GData-Version'] = '3.0';
						google.resolve(G.credentials)
					})
				})
			}else{
				google.resolve(G.credentials)
			}
			return google.promise;
		},
		credentials: function(){
			return G.credentials
		},
		request: function(method, url, params){
			var deferred = $q.defer()
			tools.auth('https://www.googleapis.com/auth/drive').then(function(auth){
				$http({
					method: 	method,
					url:		url,
					params: 	params
				}).success(function(r){
					deferred.resolve(r)
				});
			})
			return deferred.promise;
		},
		drive: {
			listDocs: function(google){
				var deferred = $q.defer()
				tools.auth('https://www.googleapis.com/auth/drive').then(function(auth){
					$http.get('https://www.googleapis.com/drive/v3/files').success(function(r){
						deferred.resolve(r)
					});
				})
				return deferred.promise;
			}
		}
	}
	return tools;
});
app.factory('Cloudinary', function($timeout, $q, config){
	var tools = {
		upload: function(configOverride){
			var deferred = $q.defer();
			var cconfig = Object.assign({
				cloud_name: config.cloudinary.cloudName,
				upload_preset: config.cloudinary.uploadPreset,
				theme: 'white',
				multiple: true,
			}, configOverride);
			// console.log(cconfig);
			let results = [];
			cloudinary.openUploadWidget(cconfig,
			function(error, result) {
				if(result && result.event == 'success'){
					results.push(result.info);
				}else if(result && result.event == 'close'){
					if(results.length){
						results = results.map(function(doc){
							doc.pdf_url = doc.secure_url.replace('.jpg', '.pdf')
							doc.pdf_url = doc.pdf_url.replace('.png', '.pdf')
							doc.pdf_url = doc.pdf_url.replace('.tiff', '.pdf')
							doc.pdf_url = doc.pdf_url.replace('.bmp', '.pdf')
							if(doc.secure_url.indexOf('.png') != -1)
								doc.img_url = doc.secure_url;
							else
								doc.img_url = doc.pdf_url.replace('.pdf', '.jpg')
							return doc;
						})
						deferred.resolve(results)
					}else{
						deferred.reject('None, Selected');
					}
				}
			});
			return deferred.promise;
		}
	}
	return tools;
});
