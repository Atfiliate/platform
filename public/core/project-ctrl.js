/*global angular, app, firebase, Mousetrap, moment, whois*/
app.lazy.controller('ProjCtrl', function ProjCtrl($scope, $timeout, $interval, $firebaseObject, $firebaseArray, $mdMedia, $mdDialog, 
	$mdSidenav, $mdBottomSheet, $mdToast, $routeParams, $http, $sce, $q, $location, $sanitize, $compile, $templateCache, Auth, Fire, Cloudinary, Stripe, Form, config){
	$scope.$mdDialog	= $mdDialog;
	$scope.cloudinary	= Cloudinary;
	$scope.moment		= moment;
	$scope.temp 		= {};
	//we need to initialize api each time so it doesn't retain leftovers from a previous view.
	let api = window.api = $scope.api = {
		_ct:		25, //history count
		_elements:	{},
		_unElems:	{},
		_events:	{},
		_waiters:	[], // used to store fn's to be called on api.register
		_listeners: [], // used to store fn's to be called on api.act
		_once:		[],
		_checks:	{},
		_history:	[],
		_future:	[],
		_proclaim: function(action, rest){
			if(action[0] != '$')
				api._events[action] = api._events[action] || {action, rest}
			api._listeners.forEach(l=>{
				if(l.action == action)
					l.fn(...rest);
				else if(l.action == 'any')
					l.fn(action, ...rest)
			})
		},
		broadcast: (action, ...rest)=>{
			api._proclaim(action, rest)	
		},
		act: (action, fn, undo, ...rest)=>{
			return $q((res,rej)=>{
				api.check(action, rest).then(r=>{
					$timeout(()=>{
						api._proclaim(action, rest);
						api._future = [];
						if(fn && undo)
							api._history.push({action,fn,undo,rest});
						if(api._history.length > api._ct)
							api._history.shift();
						if(fn)
							fn(...rest);
						res(r);
					}, 0);
				}).catch(e=>{
					if(typeof e == 'string'){
						tools.alert(e);
					}else if(e){	
						console.log(e);
						rej(e);
					}
				});	
			})
		},
		undo: ()=>{
			var item = api._history.pop();
			if(item){
				item.undo(...item.rest);
				api._proclaim(item.action+'.undo', item.rest);
				api._future.push(item);
			}
		},
		redo: ()=>{
			var item = api._future.pop();
			if(item){
				item.fn(...item.rest);
				api._proclaim(item.action+'.redo', item.rest);
				api._history.push(item);
			}
		},
		check: (action, rest)=>{
			if(api._checks[action]){
				return $q.all(api._checks[action].map(checkFn=>{
						return checkFn(...rest);
					})
				)
			}else{
				return $q.resolve();
			}
		},
		limit: (action, checkFn)=>{ //register will pass: (location,element,fn) to the limit check fn
			api._checks[action] = api._checks[action] || [];
			api._checks[action].push(checkFn);
		},
		register: (location, element, fn)=>{
			api.broadcast(`api.register`, location, element, fn);
		
			if(typeof location == 'object'){
				location.forEach(key=>{
					api._elements[key] = [];
				});
			}else if(element){
				api.check('api.register', [location, element, fn]).then(r=>{
					if(!api._elements[location])
						api._elements[location] = [];
		
					element.fn = element.fn || fn;
		
					if(element.template)
						element.template = $sce.trustAsResourceUrl(element.template);
		
					api._elements[location].push(element);
					api.waitCheck();
				}).catch(e=>{
					if(!api._unElems[location])
						api._unElems[location] = [];
		
					element.fn = element.fn || fn;
					api._unElems[location].push(element);
				});
		
				return element;
			}
		},
		remove: (location, element)=>{
			let idx = api._elements[location].indexOf(element);
			if(idx != -1){
				// api.act('api.remove', ()=>{
					api._elements[location].splice(idx, 1);
				// }, location, element)
			}
		},
		waitCheck: ()=>{
			for(var i = api._waiters.length-1; i>=0; i--){
				let w = api._waiters[i];
				let elemLoc = pathValue(api, `_elements.${w.location}`) || [];
				let elem = elemLoc.find(e=>e.name == w.name);
				if(elem){
					api._waiters.splice(i, 1);
					w.fn(elem);
				}
			}
		},
		wait: (location, name, fn)=>{
			api._waiters.push({location, name, fn});
			api.waitCheck();
		},
		on: (action, fn)=>{
			api._listeners.push({action, fn});
			if(api._events[action]) //This already occurred at least once.
				fn(...api._events[action].rest);
		},
		clear: ()=>{
			api._elements	=	{}
			api._unElems	=	{}
			api._events 	=	{}
			api._waiters	=	[]
			api._listeners	=	[]
			api._once		=	[]
			api._checks 	=	{}
			api._history	=	[]
			api._future 	=	[]
		}
	}

	Mousetrap.bind('ctrl+z', (e)=>{
		e.preventDefault();
		$timeout(()=>{
			api.undo();
		}, 0);
	});
	Mousetrap.bind('ctrl+y', (e)=>{
		e.preventDefault();
		$timeout(()=>{
			api.redo();
		}, 0);
	});
	
	// $scope.data = {};
	var projectId = $routeParams.view || 'default';
	document.title = $routeParams.view.capitalize();
	var page,pageRef,templateRef,historyRef,snapshotRef,db;
	
	
	let onOnline = ()=>{
		$timeout(()=>{
			$scope.offline = false;
		});
	};
	let onOffline = ()=>{
		$timeout(()=>{
			$scope.offline = true;
		});
	};
	window.addEventListener('online', onOnline);
	window.addEventListener('offline', onOffline);
	
	$scope.$on('$destroy', ()=>{
		window.removeEventListener('online', onOnline);
		window.removeEventListener('offline', onOffline);
		Mousetrap.unbind('ctrl+z');
		Mousetrap.unbind('ctrl+y');
		Mousetrap.unbind('ctrl+e');
		Mousetrap.unbind('ctrl+s');
	});
	

	var tools = $scope.tools = {
		init: function(){
			console.log('init proj')
			let ab = JSON.parse(localStorage.getItem('ab') || '{}');
			if($scope.params.v)
				pathValue(ab, $routeParams.view, $scope.params.v);
			let v = pathValue(ab, $routeParams.view) || 'default';
			
			$http.get(`/project/${projectId}?v=${v}`).then(r=>{
				tools.render(r.data)
			})

			Mousetrap.bind('ctrl+e', function(e){
				e.preventDefault();
				if($scope.user.is('developer')){
					if($scope.addon.edit){
						$scope.addon.edit.init();
						return;
					}else{
						tools.addon.load({
							url:	'/core/edit.js',
							meta: {
								name:			'edit',
								version:		'1.0.0',
								title:			'Project Editor',
							},
						})
						tools.addon.load({
							url:	'/core/editAi.js',
							meta: {
								name:			'editAi',
								version:		'1.0.0',
								title:			'Edit AI',
							},
						})
					}
				}
			})
		},
		render: function(page){
			$scope.page = page;
			$scope.addon = {};
			if(page.title)
				document.title = page.title;
			var promises = [];
			if(page.js){
				$q.all(promises).then(function(r){
					try{
						var js;
						eval('js = $scope.js = '+page.js)
						if(js.init){
							js.init(window.api);
						}
					}catch(e){
						$http.post('cloud/log', {
							url:		window.location.href,
							userId:		pathValue($scope, 'user.uid') || 'guest',
							deviceId:	JSON.parse(localStorage.device || '{}').id,
							createdOn:	new Date().toISOString(),
							name:		e.name,
							message:	e.description, 
							stack:		e.stack,
							line:		e.line,
							trace:		console.trace(),
							env:		{
								browser:	navigator.appName,
								agent:		navigator.userAgent,
								version:	navigator.appVersion
							}
						})
						// console.error(e);
						// throw(e.stack); //If you liked the way errors were before, use this... 
						throw(e);
					}
				})
			}
		},
		toggleSide: function(id){
			$mdSidenav(id).toggle()
		},
		alert: function(message, confirm){
			if(confirm){
				return $q((res,rej)=>{
					$mdToast.show(
						$mdToast.simple().textContent(message).hideDelay(0).action(confirm)
					).then(r=>{
						if(r == 'ok')
							res();
						else
							rej();
					}).catch(e=>{
						rej();
					})
				})
			}else{
				$mdToast.show($mdToast.simple().textContent(message).hideDelay(5000));
			}
		},
		dialog: function(dialog, params){
			params = Object.assign({
				scope: $scope,
				preserveScope: true,
				multiple: true,
				parent: angular.element(document.body),
				clickOutsideToClose: true
			}, params);
			if (typeof dialog === 'string' && dialog.trim().charAt(0) === '<') {
				params.template = dialog;
			} else {
				if (dialog.includes('http'))
					dialog = $sce.trustAsResourceUrl(dialog);
				else
					dialog = tools.component.get(dialog);
				params.templateUrl = dialog;
			}
			var depth = (history.state && history.state.dlg || 0) + 1;	// Back button closes this dialog (one per press)
			history.pushState({dlg: depth}, '');
			function onBack(){
				if(!history.state || !history.state.dlg || history.state.dlg < depth){
					window.removeEventListener('popstate', onBack);	// once: a 2nd quick Back must not cancel the next dialog too
					$mdDialog.cancel();
				}
			}
			window.addEventListener('popstate', onBack);
			var p = $mdDialog.show(params);
			p.then(done, done);
			function done(){
				window.removeEventListener('popstate', onBack);
				if(history.state && history.state.dlg === depth) history.back();
			}
			return p;
		},
		copy: function(txtToCopy, notice){
			return $q((res,rej)=>{
				var body = angular.element(document.body);
				var textarea = angular.element('<textarea/>');
				textarea.css({
					position: 'fixed',
					opacity: '0',
				});
				textarea.val(txtToCopy);
				body.append(textarea);
				try{
					textarea[0].focus();
					textarea[0].select();
					var successful = document.execCommand('copy');
					if(successful){
						if(notice)
							tools.alert(notice);
						res();
					}else{
						rej(new Error('Copy command was unsuccessful.'));
					}
				}catch(e){
					rej(e);
				}finally{
					textarea.remove();
				}
			})
		},
		component: {
			path: function(component = {}){
				if(component.global)
					return window.location.origin+'/project/component/'+component.id;
				else
					return window.location.origin+'/project/'+$routeParams.view+'/component/'+component.id;
			},
			get: function(id){
				//return url for ng-include.  if in edit, return dynamic url.
				if(id.includes('://')){
					return id;
				}else{
					var suffix = '?c=awesome';
					if($scope.edits)
						suffix += '&test='+$scope.edits;
					if(pathValue($scope, 'page.vid'))
						suffix += `&v=${pathValue($scope, 'page.vid')}`;
					//project/:uid/component/:componentId
					if(id.indexOf('/') != -1){
						id = id.replaceAll('/', '');
						return window.location.origin+'/project/component/'+id+suffix;
					}else{
						return window.location.origin+'/project/'+$routeParams.view+'/component/'+id+suffix;
					}
				}
			}
		},
		cloud: {
			path: function(cloud = {}){
				if(cloud.global)
					return window.location.origin+'/project/cloud/'+cloud.id;
				else
					return window.location.origin+'/project/'+$routeParams.view+'/cloud/'+cloud.id;
			},
			get: function(id){
				//return url for ng-include.  if in edit, return dynamic url.
				if(id.includes('://')){
					return id;
				}else{
					var suffix = '?c=awesome';
					if($scope.edits)
						suffix += '&test='+$scope.edits;
					if(pathValue($scope, 'page.vid'))
						suffix += `&v=${pathValue($scope, 'page.vid')}`;
					//project/:uid/cloud/:componentId
					if(id.indexOf('/') != -1){
						id = id.replaceAll('/', '');
						return window.location.origin+'/project/cloud/'+id+suffix;
					}else{
						return window.location.origin+'/project/'+$routeParams.view+'/cloud/'+id+suffix;
					}
				}
			}
		},
		img: {
			_quality:	'largeImageURL',
			edit: function(ev, imgObj){
				var defer = $q.defer();
				imgObj = imgObj || {};
				imgObj.src = imgObj.src || '';
				imgObj.width = imgObj.width || (imgObj.zoom && imgObj.zoom.w) || 300
				imgObj.height = imgObj.height || (imgObj.zoom && imgObj.zoom.h) || 200
				imgObj.zoom = imgObj.zoom || {w:imgObj.width || 300, h:imgObj.height || 200, x:0, y:0}
				imgObj.target = imgObj.target || {w:imgObj.width || 300, h:imgObj.height || 200}
				$scope.temp.img = imgObj;
				
				$mdDialog.show({
					scope: $scope,
					preserveScope: true,
					templateUrl: '/component/imgCrop.html',
					parent: angular.element(document.body),
					targetEvent: ev,
					clickOutsideToClose: true,
					multiple: true,
					onComplete: function(){
						$scope.tempImgCrop.fromJson($scope.temp.img);
					}
				}).then(function(imgObj){
					defer.resolve(imgObj)
				})
				return defer.promise;
			},
			set: function() {
				var imgObj = $scope.tempImgCrop.toJson();
				$mdDialog.hide(imgObj);
			},
			upload2crop: function(ev) {
				var zoom = {
					w: $scope.temp.img.width,
					h: $scope.temp.img.height,
					x: 0,
					y: 0,
				}
				Cloudinary.upload().then(function(r){
					$scope.tempImgCrop.set(zoom, r[0].secure_url);
				})
			},
			browse2crop: function(ev){
				tools.img.browse(ev).then(function(imgUrl){
					$scope.tempImgCrop.init(imgUrl);
				})	
			},
			browse: function(ev, quality){
				if(quality)
					tools.img._quality = quality;
				var defer = $q.defer();
				tools.dialog('/core/imgBrowser.dialog').then(imgUrl=>{
					imgUrl = imgUrl.replace('https://pixabay.com/get/', 'https://res.cloudinary.com/'+config.cloudinary.cloudName+'/image/upload/pixel/')
					defer.resolve(imgUrl);
				})
				// $mdDialog.show({
				// 	scope: $scope,
				// 	preserveScope: true,
				// 	templateUrl: '/component/imgBrowse.html',
				// 	parent: angular.element(document.body),
				// 	targetEvent: ev,
				// 	clickOutsideToClose: true,
				// 	multiple: true,
				// 	onComplete: function(){
						
				// 	}
				// }).then(function(imgUrl){
				// 	imgUrl = imgUrl.replace('https://pixabay.com/get/', 'https://res.cloudinary.com/'+config.cloudinary.cloudName+'/image/upload/pixel/')
				// 	defer.resolve(imgUrl);
				// })
				return defer.promise;
			},
			search: function(term){
				$http.get('cloud/pixel?min_width=1500&response_group=high_resolution&per_page=80&q='+term).then(function(r){
					$scope.temp.imgSearchResults = r.data.hits;
				})
			},
			cancel: function(){
				$mdDialog.cancel();
			},
			use: function(img){
				let url = img[tools.img._quality] || img.largeImageURL || img.webformatURL;
				$mdDialog.hide(url);
			}
		},
		addon: {
			/*
				addon.confirm =>	user approves un-signed addon
				addon.deny =>		user denies un-signed addon
				addon.sign =>		user signs addon
				addon.install =>	user installs addon
				addon.uninstall =>	user removes addon
			*/
			dialogs: {
				validate:	'/core/addon-validate.dialog',
				browse: 	'/core/addon-browse.dialog',
				dev:		'/core/addon-dev.dialog',
				view:		'/core/addon-view.dialog',
			},
			init: (list)=>{
				tools.addon._list = list || [];
				tools.addon._invalidList = [];
				$scope.addon = $scope.addon || {};
			
				$q.all((list || []).map(m=>{
					return $q(res=>{
						if(!m || m.$ignore)
							return res({ignored: true, manifest: m});
			
						tools.addon.verify(m)
						.then(manifest=>{
							return tools.addon.load(manifest);
						})
						.then(result=>{
							res(result);
						})
						.catch(e=>{
							if(tools.addon._invalidList.length == 0)
								tools.dialog(tools.addon.dialogs.validate);
			
							tools.addon._invalidList.push(m);
							res({invalid: true, manifest: m, error: e});
						});
					});
				}))
				.then(()=>{
					api.broadcast('addons.loaded');
				});
			},
			verify: manifest=>{ //verifies addon integrity (signature) before running.
				return $q((res, rej)=>{
					let publicKey = pathValue($scope, 'page.publicKey') || config.publicKey || tools.validate._publicKey;
					let signature = manifest.signature || '';
					let cleanManifest = tools.addon.encoded(manifest);
					tools.validate.verify(cleanManifest, signature, publicKey).then(isValid=>{
						if(isValid || manifest.$verified){
							res(manifest);
						}else{
							rej(manifest);
						}
					})
				})
			},
			load: manifest=>{
				return $q((res, rej)=>{
					try{
						$http.get(manifest.url).then(r=>{
							let addon = r.data;
							if(typeof r.data == 'string'){
								addon = (function(str){
									try{
										return eval(str + `\n//# sourceURL=${manifest.url}`)
									}catch(e){
										console.error(e);
										console.log('there was an error-------------------------------------------')
									}
								})(addon)
							}else{
								addon.meta.url = manifest.url;
							}
							if(addon){
								$scope.addon[addon.meta.name] = addon;
								manifest.$installed = true;
								if($scope.addon[addon.meta.name].init){
									let p = $scope.addon[addon.meta.name].init(api) || $q.resolve();
									if(p.then){
										p.then(r=>{
											res(addon);
										})
									}else{
										res(addon);
									}
								}else{
									res(addon);
								}
							}else{
								console.info(`The addon at: ${manifest.url} could not be loaded.`)
							}
						})
					}catch(e){
						console.log('--THERE WAS AN ERROR LOADING THE FOLLOWING ADDON', manifest)
						console.log(e);
						rej({
							title:	'Error loading addon',
							manifest, e
						})
					}
				})
			},
			genId: manifest=>{
				let m = tools.addon.vanilla(manifest);
				let id = 'addon-'+JSON.stringify(m).hashCode();
				return id;
			},
			vanilla: (manifest, attrs)=>{  //clean manifest data.
				manifest = typeof manifest == 'string' ? angular.fromJson(manifest) : manifest;
				attrs = attrs || ['name', 'version', 'title', 'description', 'img', 'url', 'signature', 'createdBy'];
				let m2 = {};
				attrs.forEach(k=>{
					if(manifest[k])
						m2[k] = manifest[k] || null;
				})
				return m2;
			},
			encoded: manifest=>{
				return tools.addon.vanilla(manifest, ['createdBy', 'description', 'img', 'name', 'title', 'url']);
			},
			copyManifest: manifest=>{
				manifest = tools.addon.vanilla(manifest, ['name', 'version', 'title', 'description', 'img', 'url', 'signature', 'installId', 'createdBy']);
				tools.copy(JSON.stringify(tools.addon.vanilla(manifest)), 'Addon manifest copied to clipboard');
			},
			
			confirm: (manifest)=>{ //user approves
				manifest.$confirmed = true;
				manifest.$id = tools.addon.genId(manifest);
				let idx = tools.addon._invalidList.indexOf(manifest);
				tools.addon._invalidList.splice(idx, 1);
				tools.addon.load(manifest);
				api.broadcast('addon.confirm', manifest);
				if(tools.addon._invalidList.length == 0){
					$mdDialog.hide();
					api.broadcast('addon.verifyComplete', manifest);
				}
			},
			deny: (manifest)=>{
				manifest.$denied = true;
				manifest.$id = tools.addon.genId(manifest);
				let idx = tools.addon._invalidList.indexOf(manifest);
				tools.addon._invalidList.splice(idx, 1);
				api.broadcast('addon.deny', manifest);
				if(tools.addon._invalidList.length == 0){
					$mdDialog.hide();
					api.broadcast('addon.verifyComplete', manifest);
				}
			},
			sign: (manifest, privateKey)=>{ //user signs
				privateKey = privateKey || (tools.validate._keys && tools.validate._keys.privateKey) || tools.validate._privateKey;
				manifest.title = manifest.title.replace('**', '').replace('** (DEV)', '');
				let cleanManifest = tools.addon.encoded(manifest);
				tools.validate.sign(cleanManifest, privateKey).then(signature=>{
					manifest.signature = signature;
					let idx = tools.addon._invalidList.indexOf(manifest);
					tools.addon._invalidList.splice(idx, 1);
					tools.addon.load(manifest);
					api.broadcast('addon.sign', manifest);
					if(tools.addon._invalidList.length == 0){
						$mdDialog.hide();
						api.broadcast('addon.verifyComplete', manifest);
					}
				})
			},
			
			browse: (list)=>{
				tools.addon._browseList = list;
				tools.dialog(tools.addon.dialogs.browse);
			},
			view: (addon)=>{
				tools.addon._focus = addon;
				tools.dialog(tools.addon.dialogs.view);
			},
			install: addon=>{
				let price = pathValue(addon, 'price.amount');
				let interval = pathValue(addon, 'price.interval');
				if(!price || confirm(`By installing this addon, you are adding: ${price}/${interval} to your account charges.  Do you wish to continue?`)){
					addon.$installed	= true;
					addon.installId 	= addon.installId || tools.addon.genId(addon);
					addon.installedOn	= new Date();
					addon.installedBy	= $scope.user.uid;
					addon.createdBy		= addon.createdBy || $scope.user.uid;
					tools.addon.load(addon).then(()=>{
						api.broadcast('addon.install', addon);	
					})
				}
			},
			uninstall: addon=>{
				api.broadcast('addon.uninstall', addon);
			},
			dev: {
				init: ()=>{
					api.act('addon.dev', ()=>{
						$mdDialog.hide();
						tools.dialog(tools.addon.dialogs.dev)
					})
				},
				install: (url)=>{
					$http.get(url).then(r=>{
						let addon = r.data;
						if(typeof addon == 'string')
							addon = (function(str){
								return eval(str + `\n//# sourceURL=${url}`)
							})(addon)
						
						if(addon.meta && !addon.meta.signature)
							addon.meta.title = `**${addon.meta.title}** (DEV)`;
						addon.meta.url = url;
						$mdDialog.hide();
						tools.addon.install(addon.meta);
					})
				},
			},
		},
		validate: {
			keys: {
				generate: ()=>{
					let defer = $q.defer();
					crypto.subtle.generateKey({
						name: 'RSA-PSS', 
						modulusLength: 2048,
						publicExponent: new Uint8Array([1, 0, 1]),
						hash: 'SHA-256'
					}, true, ['sign','verify']).then(r=>{
						tools.validate._keys = r;
						tools.validate.keys.export().then(keys=>{
							defer.resolve(keys)
						})
					});
					return defer.promise; 
				},
				export: ()=>{
					return $q.all([
						crypto.subtle.exportKey('jwk', tools.validate._keys.privateKey).then(r=>{
							tools.validate._privateKey = JSON.stringify(r);
						}),
						crypto.subtle.exportKey('jwk', tools.validate._keys.publicKey).then(r=>{
							tools.validate._publicKey = JSON.stringify(r);
						})
					]).then(r=>{
						return tools.validate;
					})
				},
				import: (publicPrivate, keyImport)=>{
					keyImport = keyImport || JSON.parse(tools.validate[`_${publicPrivate}Key`]);
					return crypto.subtle.importKey(
						'jwk',
						keyImport,
						{
							name: 'RSA-PSS', 
							modulusLength: 2048,
							publicExponent: new Uint8Array([1, 0, 1]),
							hash: 'SHA-256'
						},
						true,
						keyImport.key_ops
					).then(r=>{
						tools.validate[`_${publicPrivate}Key`] = r;
						return r;
						// tools.validate._keys = r;
					})
				}
			},
			a2b64: (arrayBuffer)=>{
			    var byteArray = new Uint8Array(arrayBuffer);
			    var byteString = '';
			    for(var i=0; i < byteArray.byteLength; i++) {
			        byteString += String.fromCharCode(byteArray[i]);
			    }
			    var b64 = window.btoa(byteString);
			    return b64;
			},
			b642a: (b64)=>{
				var byteString = window.atob(b64);
				var byteArray = new Uint8Array(byteString.length);
				for(var i=0; i < byteString.length; i++) {
				    byteArray[i] = byteString.charCodeAt(i);
				}
				return byteArray;
			},
			encode: doc=>{
				doc = typeof doc == 'string' ? doc : JSON.stringify(doc);
				let enc = new TextEncoder();
				return enc.encode(doc);
			},
			sign: (doc, privateKey)=>{
				doc = tools.validate.encode(doc);
				privateKey = privateKey || (tools.validate._keys && tools.validate._keys.privateKey) || tools.validate._privateKey;
				if(typeof privateKey == 'string')
					privateKey = JSON.parse(privateKey);
				if(privateKey.alg)
					privateKey = tools.validate.keys.import('private', privateKey);
				else
					privateKey = $q.resolve(privateKey);
				// return new Promise(res=>{
				return privateKey.then(pk=>{
					return crypto.subtle.sign({
						name: "RSA-PSS",
						saltLength: 32,
					}, pk, doc).then(r=>{
						let signature = tools.validate.a2b64(r);
						return signature;
						// res(signature);
					})	
				})
				// });
			},
			verify: (doc, signature, publicKey)=>{
				doc = tools.validate.encode(doc);
				publicKey = publicKey || (tools.validate._keys && tools.validate._keys.publicKey) || tools.validate._publicKey;
				if(typeof publicKey == 'string')
					publicKey = JSON.parse(publicKey);
				if(publicKey.alg)
					publicKey = tools.validate.keys.import('public', publicKey);
				else
					publicKey = $q.resolve(publicKey);
				return publicKey.then(pk=>{
					return crypto.subtle.verify({
						name: "RSA-PSS",
						saltLength: 32,
					}, pk, tools.validate.b642a(signature), doc);	
				})
			}
		},
		jwt: ()=>{
			return $q(res=>{
				firebase.auth().currentUser.getIdToken(true).then(jwt=>{
					res(jwt)
				}).catch(e=>{
					res(false)
				})
			})
		},
	}

	tools.init();
	it.ProjCtrl = $scope;
});
