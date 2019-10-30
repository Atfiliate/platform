/*
	global app, angular, Stripe, firebase, cloudinary, gapi
*/
app.factory('config', function(){
	//whois from app.js loads config data and stores it in localStorage.
	//config gets infomration and distributes it when necessary.
	var config = localStorage.getItem('whois');
	config = JSON.parse(config);
	firebase.initializeApp(config.firebase);
	return config;
})

app.factory('Fire', function($q, Auth, $routeParams){
	let db = firebase.firestore();
	let _config = {prefix: ''}
	function isIsoDate(str) {
		if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) return false;
		var d = new Date(str);
		return d.toISOString()===str;
	}
	var Fire = function(path){
		var fire = this;
		fire._path = _config.prefix+path;
		fire._parts = path.split('/');
		fire._cd = !!(fire._parts.length % 2) ? 'collection' : 'doc';
		fire._ref = db[fire._cd](fire._path);
		fire._qref = fire._ref;
		fire._clean = (obj)=>{
			if(obj){
				var keys = Object.keys(obj);
				if(keys.indexOf('_firestoreClient') == -1){
					keys.forEach(k=>{
						if(obj[k]){
							if(obj[k].toDate)
								obj[k] = obj[k].toDate();
							else if(obj[k].nanoseconds)
								obj[k] = new Date(obj[k]*1000);
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
		fire._prepare = (obj)=>{
			if(obj){
				Object.keys(obj).forEach(k=>{
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
		fire._become = function(doc){
			var data = doc.data();
			var d = (doc.exists ? fire._clean(data) : {});
			d.id = doc.id;
			d.$fire = {
				ref: doc.ref,
				save: function(){
					let $fire = d.$fire;
					delete d.$fire;
					let copy = angular.copy(d);
					d.$fire = $fire;
					copy = fire._prepare(copy);
					return d.$fire.ref.set(copy);
				},
				delete: function(){
					if(fire.list && !fire._listen){
						var idx = fire.list.indexOf(d);
						fire.list.splice(idx, 1);
					}
					return d.$fire.ref.delete();
				},
				update: function(attrObj){
					Object.keys(attrObj).forEach(k=>{
						d[k] = attrObj[k];
					})
					return d.$fire.ref.update(attrObj);
				}
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
			if(fire._cd == 'collection'){
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
			//[] WIP
			if(fire._cd == 'collection'){
				fire._ignore = fire._qref.onSnapshot(snap=>{
					var promises = [];
					snap.docChanges().forEach(change=>{
						check = check || Promise.resolve();
						promises.push(check(change).then(r=>{
							if(fire.list){
								if(change.type === 'added'){
									var doc = change.doc;
									var odoc = fire.list.find(d=>d.id==change.doc.id);
									if(!odoc)
										fire.list.push(fire._become(doc));
								}else if(change.type === 'modified'){
									var data = change.doc.data();
									var doc = fire.list.find(d=>d.id==change.doc.id);
									Object.keys(data).forEach(k=>{
										doc[k] = data[k];
									})
								}else if(change.type === 'removed'){
									var idx = fire.list.findIndex(d=>d.id==change.doc.id);
									fire.list.splice(idx, 1);
								}
							}
						}))
					})
					Promise.all(promises).then(()=>{
						fire._listen && fire._listen(fire.list);	
					})
				})
			}else{
				fire._ignore = fire._qref.onSnapshot(doc=>{
					check = check ? check(doc) : true;
					if(check){}
						fire.obj = fire._become(doc);
						fire._listen && fire._listen(fire.obj)
					}
				})
			}
			//setup listener and trigger callback on data-change.
		}
		fire.add = function(item){
			var deferred = $q.defer();
			item.createdOn = new Date();
			item = fire._prepare(item);
			fire._ref.add(item).then(r=>{
				r.get().then(doc=>{
					var obj = fire._become(doc);
					if(fire.list && !fire._listen)
						fire.list.push(obj);
					deferred.resolve(obj);
				}).catch(e=>{
					deferred.reject(e);
				})
			}).catch(e=>{
				deferred.reject(e);
			})
			return deferred.promise;
		}
		fire.set = function(item){
			var deferred = $q.defer();
			item.createdOn = new Date();
			var id = item.id;
			delete item.id;
			item = fire._prepare(item);
			fire._ref.doc(id).set(item).then(r=>{
				fire._ref.doc(id).get().then(doc=>{
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
	Fire.config = function(config){
		if(config)
			_config = config;
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
				}
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
		fire.listen = function(callback){
			//setup listener and trigger callback on data-change.
		}
		fire.add = function(item){
			var deferred = $q.defer();
			item.createdOn = new Date();
			var newItemRef = fire._ref.push();
			newItemRef.set(item);
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
			delete item.id;
			fire._ref.child(id).set(item).then(r=>{
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
app.factory('Auth', function($q, $firebaseAuth, $firebaseObject){
	var signin = $q.defer();
	$firebaseAuth().$onAuthStateChanged(function(user){
		if(user){
			var ref = firebase.database().ref().child('site/public/roles').child(user.uid);
			var obj = $firebaseObject(ref);
			obj.$loaded().then(function(){
				user.roles = obj || {};
				user.flatRoles = Object.keys(user.roles).filter(function(r){return r.indexOf('$')==-1})
				user.is = function(role){
					if(role && role.slice(0,1) == '!'){
						role = role.slice(1);
						return role=='any' ? !user.flatRoles.length : !user.roles[role];
					}else{
						return !role || role=='all' || (role=='any' && user.flatRoles.length) || !!user.roles[role];
					}
				}
				user.jwt = function(){
					return firebase.auth().currentUser.getToken(true)
				}
				signin.resolve(user)
			});
		}
	})
	
	return function(){
		return signin.promise;
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
