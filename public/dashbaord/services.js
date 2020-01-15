app.factory('Fire', function($q){
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
			Fire.ct.read++;
			var data = doc.data();
			var d = (doc.exists ? fire._clean(data) : {});
			d.id = doc.id;
			d.$fire = {
				ref: doc.ref,
				save: function(){
					Fire.ct.write++;
					let $fire = d.$fire;
					delete d.$fire;
					let copy = angular.copy(d);
					d.$fire = $fire;
					copy = fire._prepare(copy);
					return d.$fire.ref.set(copy);
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
					Object.keys(attrObj).forEach(k=>{
						d[k] = attrObj[k];
					})
					return d.$fire.ref.update(attrObj);
				},
				listen: function(check, callback){
					//returns ignore function.
					return d.$fire.ref.onSnapshot(doc=>{
						Fire.ct.read++;
						let notify = (typeof check == 'function' ? check(doc) : true);
						if(notify){
							fire.obj = fire._become(doc);
							callback && callback(fire.obj)
						}
					})
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
									var data = fire._become(change.doc);
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
					let notify = (typeof check == 'function' ? check(doc) : true);
					if(notify){
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