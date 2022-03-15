/*global angular, app, firebase, Mousetrap, moment, whois*/
app.lazy.controller('ProjCtrl', function ProjCtrl($scope, $timeout, $interval, $firebaseObject, $firebaseArray, $mdMedia, $mdDialog, 
	$mdSidenav, $mdBottomSheet, $mdToast, $routeParams, $http, $sce, $q, $location, $sanitize, $compile, Auth, Fire, Cloudinary, Stripe, Form, config){
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
			return new Promise((res,rej)=>{
				api.check(action, rest).then(r=>{
					$timeout(()=>{
						api._proclaim(action, rest);
						if(fn && undo)
							api._history.push({action,fn,undo,rest});
						if(api._history.length > api.ct)
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
				return Promise.all(api._checks[action].map(checkFn=>{
						return checkFn(...rest);
					})
				)
			}else{
				return Promise.resolve();
			}
		},
		limit: (action, checkFn)=>{ //register will pass: (location,element,fn) to the limit check fn
			api._checks[action] = api._checks[action] || [];
			api._checks[action].push(checkFn);
		},
		register: (location, element, fn)=>{
			// register needs to consider as reference: user preferences
			// this could include: 'hide' & 'order' for registered elements.
			api.broadcast(`api.register`, location, element, fn);
			if(typeof location == 'object'){
				location.forEach(key=>{
					api._elements[key] = [];
				})
			}else{
				if(element){
					api.check('api.register', location, element, fn).then(r=>{
						if(!api._elements[location])
							api._elements[location] = [];
						element.fn = element.fn || fn;
						if(element.template)
							element.template = $sce.trustAsResourceUrl(element.template);
						api._elements[location].push(element)
						api.waitCheck();
					}).catch(e=>{
						if(!api._unElems[location])
							api._unElems[location] = [];
						element.fn = fn;
						api._unElems[location].push(element)
					})
				}
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
	window._mfq = window._mfq || [];
	window._mfq.push(["newPageView", `project/${$routeParams.view}/${$routeParams.id}`]);
	
	var tools = $scope.tools = {
		init: function(){
			pageRef 		= firebase.database().ref('project/'+projectId).child('page');
			templateRef 	= firebase.database().ref("site/public/pageTemplates");
			historyRef		= firebase.database().ref('project/'+projectId+'/historicPages');
			snapshotRef 	= firebase.database().ref('project/'+projectId+'/snapshots');
			page 			= $firebaseObject(pageRef);

			Mousetrap.bind('ctrl+e', function(e){
				e.preventDefault();
				if($scope.user.is('developer'))
					tools.edit.init();
			})
			Mousetrap.bind('ctrl+s', function(e){
				e.preventDefault();
				tools.edit.save();
			})

			page.$bindTo($scope, "page");
			page.$loaded(function(page){
				tools.render(page)
				if(page.title)
					document.title = page.title;
			})
		},
		render: function(page){
			var promises = [];
			// if(page.data)
			// 	promises = Object.keys(page.data).map(function(key){
			// 		var ref = page.data[key];
			// 		var deferred = $q.defer();
			// 		var refPath = ref.path
			// 		if($scope.user){
			// 			refPath = refPath.replace('{{uid}}', $scope.user.uid);
			// 			refPath = refPath.replace('{{email}}', $scope.user.email);
			// 		}
			// 		Object.keys($scope.params).forEach(key=>{
			// 			refPath = refPath.replace('{{'+key+'}}', $scope.params[key]);
			// 		})

			// 		var dataRef = firebase.database().ref().child(refPath);
			// 		if(ref.array)
			// 			$scope.data[ref.alias] = $firebaseArray(dataRef);
			// 		else
			// 			$scope.data[ref.alias] = $firebaseObject(dataRef);
			// 		$scope.data[ref.alias].$loaded(function(obj){
			// 			deferred.resolve(obj)
			// 		}, function(e){
			// 			deferred.resolve(e)
			// 		})
			// 		return deferred.promise;
			// 	})
			if(page.js){
				$q.all(promises).then(function(r){
					try{
						var js;
						eval('js = $scope.js = '+page.js)
						if(js.init)
							js.init(window.api);
					}catch(e){
						$http.post('cloud/log', {
							url:		window.location.href,
							userId:		($scope.user && $scope.user.uid),
							deviceId:	JSON.parse(localStorage.device || '{}').id,
							createdOn:	new Date().toISOString(),
							name:		e.name,
							message:	e.desecription, 
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
						throw(e.stack);
					}
				})
			}
		},
		toggleSide: function(id){
			$mdSidenav(id).toggle()
		},
		alert: function(message, confirm){
			if(confirm){
				return new Promise((res,rej)=>{
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
			if(dialog.includes('http'))
				dialog = $sce.trustAsResourceUrl(dialog);
			else
				dialog = tools.component.get(dialog);
			params = Object.assign({
				scope: $scope,
				preserveScope: true,
				templateUrl: dialog,
				multiple: true,
				parent: angular.element(document.body),
				clickOutsideToClose: true
			}, params)
			return $mdDialog.show(params)
		},
		copy: function(txtToCopy, notice){
			return new Promise((res,rej)=>{
				var body = angular.element(document.body);
				var textarea = angular.element('<textarea/>');
				textarea.css({
					position: 'fixed',
					opacity: '0'
				});
				textarea.val(txtToCopy);
				body.append(textarea);
				textarea[0].select();
				var successful = document.execCommand('copy');
				if(successful){
					res()
					if(notice)
						tools.alert(notice)
				}else{
					rej()
				}
			})
		},
		
		edit: {
			init: function(){
				$scope.editSize = localStorage.getItem('editSize') || 60;
				tools.history.init();
				tools.snapshot.init();
				$scope.temp.page = angular.copy($scope.page);
				if(!$scope.temp.page.js)
					$scope.temp.page.js = 'js = {\n\tinit: function(api){\n\t\t\n\t}\n}'
				if(!$scope.temp.page.html)
					$scope.temp.page.html = '<h1>New Page</h1>'

				$scope.editors = {
					jsEditor: (editor)=>{
						$scope.temp.page.js = $scope.jsEditor.getValue();
						$scope.temp.page.jsState = tools.ace.state(editor);
					},
					htmlEditor: (editor)=>{
						$scope.temp.page.html = $scope.htmlEditor.getValue();
						$scope.temp.page.htmlState = tools.ace.state(editor);
					},
					cEditor: (editor)=>{
						$scope.temp.component.state = tools.ace.state(editor);
						if($scope.temp.component && $scope.temp.component.id)
							tools.component.save($scope.temp.component);
					},
					ccEditor: (editor)=>{
						$scope.temp.cloud.state = tools.ace.state(editor);
						if($scope.temp.cloud && $scope.temp.cloud.id)
							tools.cloud.save($scope.temp.cloud);
					}
				}
				tools.dialog('https://a.alphabetize.us/project/code/cloud/code/iZTQIVnPzPW7b2CzNUmO;WAEzasxjWZSggmwP3MER;project-settings.dialog', {
					onComplete: function(){
						tools.edit.size($scope.editSize);
					}
				})
				// tools.edit.dialog('editDialog');
			},
			// dialog: function(name, onComplete){
			// 	$scope.editSize = localStorage.getItem('editSize') || 60;
				
			// 	$mdDialog.show({
			// 		scope: $scope,
			// 		preserveScope: true,
			// 		templateUrl: `modules/project/partials/${name}.html`,
			// 		parent: angular.element(document.body),
			// 		clickOutsideToClose: true,
			// 		fullscreen: true,
			// 		multiple: 	true,
			// 		onComplete: function(){
			// 			tools.edit.size($scope.editSize);
			// 			onComplete && onComplete();
			// 		}
			// 	});
			// },
			size: function(size){
				localStorage.setItem('editSize', size)
				$scope.editSize = size;
				if(size == 60)
					var height = 400;
				else
					var height = window.innerHeight - 325;
				$('.dynaSize').css("height", height);
				$('.dynaSize').css("max-height", height);
				window.dispatchEvent(new Event('resize'))
			},
			
			save: function(keepOpen){
				//loop through all editors and save their code & state.
				Object.keys($scope.editors).forEach(editorId=>{
					if($scope[editorId]){
						$scope.editors[editorId]($scope[editorId])
					}
				})
				

				tools.history.add(angular.copy($scope.page));
				$scope.page = angular.copy($scope.temp.page)
				$scope.page.updatedOn = new Date();
				tools.render($scope.page)
				if(!keepOpen)
					$mdDialog.hide()
			},
			cancel: function(){
				$scope.temp.page = angular.copy($scope.page)
				$mdDialog.hide()
			},
			remove: function(){
				if(confirm('Are you sure you want to completly delete this project?')){
					firebase.database().ref('project/'+$routeParams.view).remove();
					$mdDialog.hide()
				}
			}
		},
		history: {
			init: function(){
				$scope.history = $firebaseArray(historyRef);
			},
			add: function(historicPage){
				historicPage.archivedBy = $scope.user.uid;
				historicPage.archivedOn = moment().toISOString();
				historicPage.title = historicPage.$id;
				delete historicPage.$id;
				delete historicPage.$priority;
				$scope.history.$add(historicPage);
				if($scope.history.length > 10)
					$scope.history.$remove(0);
			},
			focus: function(page){
				$scope.temp.page = page;
				if($scope.htmlEditor)
					$scope.htmlEditor.setValue($scope.temp.page.html, -1);
				if($scope.jsEditor)
					$scope.jsEditor.setValue($scope.temp.page.js, -1);
			}
		},
		snapshot: {
			init: function(){
				$scope.snapshots = $firebaseArray(snapshotRef);
			},
			add: function(){
				var snapPage = angular.copy($scope.page);
				snapPage.snapBy = $scope.user.uid;
				snapPage.snapOn = moment().toISOString();
				snapPage.title	= snapPage.$id;
				snapPage.description = prompt('Enter Snapshot Description');
				delete snapPage.$id;
				delete snapPage.$priority;
				$scope.snapshots.$add(snapPage);
			},
			focus: function(page){
				$scope.temp.page = page;
				if($scope.htmlEditor)
					$scope.htmlEditor.setValue($scope.temp.page.html, -1);
				if($scope.jsEditor)
					$scope.jsEditor.setValue($scope.temp.page.js, -1);
			}
		},
		snippet: {
			init: ()=>{
				tools.snippet.templates();
				$mdBottomSheet.show({
					parent: 		'#project-settings',
					templateUrl:	$sce.trustAsResourceUrl('https://a.alphabetize.us/project/code/cloud/code/iZTQIVnPzPW7b2CzNUmO;WAEzasxjWZSggmwP3MER;project-component.sheet'),
					scope:			$scope,
					preserveScope:	true
				})
			},
			templates: (reload)=>{
				let suffix = $scope.editor.session.getMode().$id == 'ace/mode/javascript' ? '.js' : '.html'
				if(reload || !tools.snippet._list){
					let path = pathValue($scope, 'temp.page.snippetRef') || 'https://a.alphabetize.us/#/project/code/gThh06um8VuYE2qsCIQf?projectId=qOBhK4TMzSy3JsnNvKTH';
					path = path.split('?');
					let gid = path[0].split('/').pop();
					let pid = path[1].split('projectId=')[1];
					$http.get(`https://a.alphabetize.us/project/code/cloud/list?gid=${gid}&pid=${pid}`).then(r=>{
						tools.snippet._list = r.data;
						$scope.temp.snippets = tools.snippet._list.filter(s=>s.id.indexOf(suffix) != -1)
					})
				}else{
					$scope.temp.snippets = tools.snippet._list.filter(s=>s.id.indexOf(suffix) != -1)
				}
			},
			select: snippet=>{
				let editor = $scope.editor;
				editor.session.insert(editor.getCursorPosition(), snippet.code)
				$mdBottomSheet.hide();
			}
		},
		template: {
			init: function(){
				// var page = $firebaseObject(pageRef);
				// 	page.$bindTo($scope, "page");
				$scope.templates = $firebaseArray(templateRef);
			},
			add: function(){
				$scope.temp.page.title = prompt('Enter Template Name')
				$scope.templates.$add($scope.temp.page);
			},
			set: function(template){
				$scope.temp.page = template;
				if($scope.htmlEditor)
					$scope.htmlEditor.setValue($scope.temp.page.html, -1);
				if($scope.jsEditor)
					$scope.jsEditor.setValue($scope.temp.page.js, -1);
			},
			save: function(template){
				if(confirm('This will over write the template content with the current page content.  Are you sure you want to continue?')){
					Object.keys($scope.temp.page).forEach(function(key){
						if(key.indexOf('$') == -1)
							template[key] = $scope.temp.page[key] || null;
					})
					$scope.templates.$save(template);
				}
			},
			remove: function(template){
				if(confirm('Are you sure you want to completly remove this template?'))
					$scope.templates.$remove(template);
			}
		},
		package: {
			init: function(view){
				view = view || $scope.params.view;
				var packageRef = whois.database().ref('whois/packages').child(view);
				$scope.packages = $firebaseArray(packageRef);
			},
			path: function(){
				let newPath = prompt('Enter alternate project pull path.');
				tools.package.init(newPath);
				tools.alert(`Loading packages from new path: ${newPath}`)
			},
			fromView: ()=>{
				let meta = {};
				let view = prompt('Enter Project Id');
				meta.view = view;
				meta.createdOn = new Date().toISOString();
				meta.createdBy = (({displayName, email, uid}) => ({displayName, email, uid}))($scope.user)
				var myPackage = firebase.database().ref('project').child(view);
				myPackage.once('value', r=>{
					var pkg = r.val();
					pkg.meta = meta;
					Object.keys(pkg).forEach(k=>{
						if(k.includes('historic'))
							delete pkg[k];
					})
					tools.package.load(pkg);
				})
			},
			load: function(newPkg){
				$scope.diff = {newPkg};
				var view = $scope.params.view;
				newPkg.origId = newPkg.$id;
				Object.keys(newPkg).forEach(k=>{
					if(k.indexOf('$') != -1)
						delete newPkg[k];
				})
				$scope.diff.packageRef = firebase.database().ref('project').child(view);
				$scope.diff.packageRef.once('value', doc=>{
					let oldPkg = $scope.diff.oldPkg = doc.val() || {};
					oldPkg.page = oldPkg.page || {};
					oldPkg.component = oldPkg.component || {};
					oldPkg.cloud = oldPkg.cloud || {};
					tools.package.analyze(oldPkg, newPkg);
				})
			},
			analyze: (pkg1, pkg2)=>{
				pkg1.cloud = pkg1.cloud || {};
				pkg1.component = pkg1.component || {};
				pkg2.cloud = pkg2.cloud || {};
				pkg2.component = pkg2.component || {};
				
				let components = [];
				components.push({
					title:	'Html',
					type: 	'page',
					path:	'page.html',
					id: 	'html',
					p1: 	pkg1.page.html,
					p2: 	pkg2.page.html,
					v1: 	pkg1.page.html,
					v2: 	pkg2.page.html,
					change: (pkg1.page.html != pkg2.page.html) ? 'change' : 'none'
				})
				components.push({
					title:	'JavaScript',
					type: 	'page',
					path:	'page.js',
					id: 	'js',
					p1: 	pkg1.page.js,
					p2: 	pkg2.page.js,
					v1: 	pkg1.page.js,
					v2: 	pkg2.page.js,
					change: (pkg1.page.js != pkg2.page.js) ? 'change' : 'none'
				})
				Object.keys({...pkg1.component, ...pkg2.component}).forEach(key=>{
					let canAdd = !pathValue(pkg1, `component.${key}.code`) && !!pathValue(pkg2, `component.${key}.code`);
					let canRemove = !!pathValue(pkg1, `component.${key}.code`) && !pathValue(pkg2, `component.${key}.code`);
					let hasChange = (pathValue(pkg1, `component.${key}.code`) != pathValue(pkg2, `component.${key}.code`));
					let change = canAdd ? 'add' : canRemove ? 'remove' : hasChange ? 'change' : 'none';
					components.push({
						title:	`Component: ${key}`,
						type: 	'component',
						path:	`component.${key}.code`,
						id: 	key,
						p1: 	pkg1.component[key],
						p2: 	pkg2.component[key],
						v1: 	pathValue(pkg1, `component.${key}.code`),
						v2: 	pathValue(pkg2, `component.${key}.code`),
						change: change
					})
				})
				Object.keys({...pkg1.cloud, ...pkg2.cloud}).forEach(key=>{
					let canAdd = !pathValue(pkg1, `cloud.${key}.code`) && !!pathValue(pkg2, `cloud.${key}.code`);
					let canRemove = !!pathValue(pkg1, `cloud.${key}.code`) && !pathValue(pkg2, `cloud.${key}.code`);
					let hasChange = (pathValue(pkg1, `cloud.${key}.code`) != pathValue(pkg2, `cloud.${key}.code`));
					let change = canAdd ? 'add' : canRemove ? 'remove' : hasChange ? 'change' : 'none';
					components.push({
						title:	`Cloud: ${key}`,
						type: 	'cloud',
						path:	`cloud.${key}.code`,
						id: 	key,
						p1: 	pkg1.cloud[key],
						p2: 	pkg2.cloud[key],
						v1: 	pathValue(pkg1, `cloud.${key}.code`),
						v2: 	pathValue(pkg2, `cloud.${key}.code`),
						change: change
					})
				})
				$scope.diff.stats = {
					changes: 	components.filter(c=>c.change == 'change').length,
					adds: 		components.filter(c=>c.change == 'add').length,
					removes: 	components.filter(c=>c.change == 'remove').length
				}
				$scope.diff.components = components;
				tools.dialog('https://a.alphabetize.us/project/code/cloud/code/iZTQIVnPzPW7b2CzNUmO;WAEzasxjWZSggmwP3MER;project-package.dialog');
			},
			compare: (item)=>{
				$scope.diff.item = item;
				return new Promise((res,rej)=>{
					console.log(item);
					let mode = 'ace/mode/html'
					if(item.path.indexOf('.js') != -1 || item.path.indexOf('_js') != -1 || item.path.indexOf('cloud.') != -1)
						mode = 'ace/mode/javascript'

					$.getScript('/vendor/ace-diff.min.js', r=>{
						tools.dialog('https://a.alphabetize.us/project/code/cloud/code/iZTQIVnPzPW7b2CzNUmO;WAEzasxjWZSggmwP3MER;project-diff.dialog', {
							onComplete: ()=>{
								$scope.diff.ace = new AceDiff({
									element:	'#codediff',
									theme:		'ace/theme/monokai',
									mode:		mode,
									left: {
										content: item.v1 || '',
									},
									right: {
										content: item.v2 || '',
									},
								});
							}
						});
					})
				});
			},
			toggleApprove: (item)=>{
				item.approved = !item.approved;
			},
			apply: (side)=>{
				$scope.diff.item.rev = $scope.diff.ace.getEditors()[side].getValue();
				$scope.diff.item.approved = true;
				$mdDialog.hide();
			},
			import: ()=>{
				let oldPkg = $scope.diff.oldPkg;
				// oldPkg.page.local = oldPkg.page.local || newPkg.page.local; //we do not update local here if set.
				$scope.diff.components.forEach(item=>{
					if(item.approved){
						if(item.change == 'change')
							pathValue(oldPkg, item.path, (item.rev || item.v2));
						else if(item.change == 'add')
							oldPkg[item.type][item.id] = item.p2;
						else if(item.change == 'remove')
							delete oldPkg[item.type][item.id];
						else
							console.log({status: 'not sure', item});
					}
				})

				$scope.diff.packageRef.set(oldPkg).then(function(){
					window.location.reload();
				})
			},
			publish: function(meta){
				var view = $scope.params.view;
				meta.view = view;
				meta.createdOn = new Date().toISOString();
				meta.createdBy = (({displayName, email, uid}) => ({displayName, email, uid}))($scope.user)
				var myPackage = firebase.database().ref('project').child(view);
				myPackage.once('value', r=>{
					var pkg = r.val();
					pkg.meta = meta;
					delete pkg.historicComponents;
					delete pkg.historicClouds;
					delete pkg.historicPages;
					$http.post('https://the.atfiliate.com/cloud/package', pkg).then(r=>{
						var toast = $mdToast.simple().textContent(r.data);
						$mdToast.show(toast);
					})
				})
				//add package to atfiliate
			}
		},
		component: {
			init: function(){
				//load list of page-related components
				$scope.inEdit = 'cEditor';
				$scope.edits = $scope.edits || 0;
				tools.ace.setup('cEditor', '', 'ace/mode/html');
				$scope.temp.component = $scope.temp.component || {};
				var lcref = firebase.database().ref('project/'+$routeParams.view+'/component');
				$scope.localComponents = $firebaseArray(lcref);
				var gcref = firebase.database().ref('project/private/component');
				$scope.globalComponents = $firebaseArray(gcref);
			},
			loadHistory: function(component){
				if(component.global)
					var historyRef 	= firebase.database().ref('project/private/historicComponents').child(component.id);
				else
					var historyRef 	= firebase.database().ref('project/'+$routeParams.view+'/historicComponents').child(component.id);
				$scope.componentHistory = $firebaseArray(historyRef);
			},
			addHistory: function(historicComponent){
				historicComponent = angular.copy(historicComponent);
				historicComponent.archivedBy = $scope.user.uid;
				historicComponent.archivedOn = moment().toISOString();
				delete historicComponent.$id;
				delete historicComponent.$priority;
				if($scope.componentHistory){
					$scope.componentHistory.$add(historicComponent);
					if($scope.componentHistory.length > 5)
						$scope.componentHistory.$remove(0);
				}
			},
			history: function(item){
				tools.component.focus(item);
			},
			search: function(needle){
				$scope.inSearch = needle && needle.length;
				if(!$scope.inSearch)
					delete $scope.componentSearch;
				$scope.globalComponents.$loaded(function(){
					$scope.cSearchResults = $scope.globalComponents.filter(function(c){
						return c.$id.indexOf(needle) != -1;
					})
				})
			},
			load: function(component){
				var componentRef = firebase.database().ref('project/private/component').child(component.id);
				componentRef.once('value', function(snap){
					tools.component.focus(snap.val())
				})				
			},
			focus: function(component){
				var editor = 'cEditor'
				component = JSON.parse(angular.toJson(component) || '{"code":""}');
				component.code = component.code || '';
				$scope.temp.component = component;

				var mime = {js: 'ace/mode/javascript', css: 'ace/mode/css'}
				var suffix = component.id.split('_')[component.id.split('_').length-1];
				var mode = mime[suffix] || 'ace/mode/html';

				tools.ace.setup(editor, component.code, mode, component.state);
				tools.component.loadHistory(component);
			},
			cache: function(){
				if($scope.temp.component){
					var minutes = prompt('Enter cache time in minutes');
					if(minutes)
						$scope.temp.component.cache = Number(minutes) * 60 * 1000; 
				}
			},
			add: function(component){
				//adds specific component to page
				$scope.temp.page.components = $scope.temp.page.components || [];
				if(!tools.component.associated(component))
					$scope.temp.page.components.push({
						id: component.id
					});
			},
			remove: function(component){
				//removes specific component from page
				var i = $scope.temp.page.components.findIndex(c=>{
					return c.id == component.id
				})
				$scope.temp.page.components.splice(i, 1)
			},
			associated: function(component){
				var id = component && component.id;
				return $scope.temp.page && $scope.temp.page.components && $scope.temp.page.components.findIndex(c=>{return c.id == id;}) != -1;
			},
			save: function(component){
				if(component){
					var component = angular.copy(component);
					component.id = component.id || component.$id;
					tools.component.addHistory(component);
					component.code = $scope['cEditor'].getValue();
					component.state = tools.ace.state($scope['cEditor']);

					delete component.$id;
					delete component.$priority;
					
					if(component.global)
						var componentRef = firebase.database().ref('project/private/component').child(component.id);
					else
						var componentRef = firebase.database().ref('project/'+$routeParams.view+'/component').child(component.id);
					
					componentRef.set(component).then(function(){
						$scope.edits++;
					})
					if(component.global)
						tools.component.add(component);
				}
			},
			delete: function(component){
				if(confirm('If other pages rely on this component they will break.  Are you sure you want to delete this component?')){
					if(component.global){
						tools.component.remove(component);
						var componentRef = firebase.database().ref('project/private/component').child(component.id);
					}else{
						var componentRef = firebase.database().ref('project/'+$routeParams.view+'/component').child(component.id);
					}
					componentRef.remove();
				}
			},
			path: function(component = {}){
				if(component.global)
					return config.origin+'/project/component/'+component.id;
				else
					return config.origin+'/project/'+$routeParams.view+'/component/'+component.id;
			},
			get: function(id){
				//return url for ng-include.  if in edit, return dynamic url.
				if(id.includes('://')){
					return id;
				}else{
					var suffix = '';
					if($scope.edits)
						suffix = '?test='+$scope.edits;
					//project/:uid/component/:componentId
					if(id.indexOf('/') != -1){
						id = id.replace('/', '');
						return config.origin+'/project/component/'+id+suffix;
					}else{
						return config.origin+'/project/'+$routeParams.view+'/component/'+id+suffix;
					}
				}
			}
		},
		cloud: {
			init: function(){
				//load list of page-related clouds
				$scope.inEdit = 'ccEditor';
				$scope.edits = $scope.edits || 0;
				tools.ace.setup('ccEditor', '', 'ace/mode/javascript');
				$scope.temp.cloud = $scope.temp.cloud || {};
				var lcref = firebase.database().ref('project/'+$routeParams.view+'/cloud');
				$scope.localclouds = $firebaseArray(lcref);
				var gcref = firebase.database().ref('project/private/cloud');
				$scope.globalclouds = $firebaseArray(gcref);
			},
			loadHistory: function(cloud){
				if(cloud.global)
					var historyRef 	= firebase.database().ref('project/private/historicClouds').child(cloud.id);
				else
					var historyRef 	= firebase.database().ref('project/'+$routeParams.view+'/historicClouds').child(cloud.id);
				$scope.cloudHistory = $firebaseArray(historyRef);
			},
			addHistory: function(historiccloud){
				historiccloud = angular.copy(historiccloud);
				historiccloud.archivedBy = $scope.user.uid;
				historiccloud.archivedOn = moment().toISOString();
				delete historiccloud.$id;
				delete historiccloud.$priority;
				if($scope.cloudHistory){
					$scope.cloudHistory.$add(historiccloud);
					if($scope.cloudHistory.length > 5)
						$scope.cloudHistory.$remove(0);
				}
			},
			history: function(item){
				tools.cloud.focus(item);
			},
			search: function(needle){
				$scope.inSearch = needle && needle.length;
				if(!$scope.inSearch)
					delete $scope.cloudSearch;
				$scope.globalclouds.$loaded(function(){
					$scope.cSearchResults = $scope.globalclouds.filter(function(c){
						return c.$id.indexOf(needle) != -1;
					})
				})
			},
			load: function(cloud){
				var cloudRef = firebase.database().ref('project/private/cloud').child(cloud.id);
				cloudRef.once('value', function(snap){
					tools.cloud.focus(snap.val())
				})				
			},
			focus: function(cloud){
				var editor = 'ccEditor'
				cloud = JSON.parse(angular.toJson(cloud) || '{"code":"js={\n\tinit: function(request, response){\n\t\t\n\t}\n}"}');
				cloud.code = cloud.code || '';
				$scope.temp.cloud = cloud;
				var mode = 'ace/mode/javascript';
				tools.ace.setup(editor, cloud.code, mode, cloud.state);
				tools.cloud.loadHistory(cloud);
			},
			cache: function(){
				if($scope.temp.cloud){
					var minutes = prompt('Enter cache time in minutes');
					if(minutes)
						$scope.temp.cloud.cache = Number(minutes) * 60 * 1000; 
				}
			},
			add: function(cloud){
				//adds specific cloud to page
				$scope.temp.page.clouds = $scope.temp.page.clouds || [];
				if(!tools.cloud.associated(cloud))
					$scope.temp.page.clouds.push({
						id: cloud.id
					});
			},
			remove: function(cloud){
				//removes specific cloud from page
				var i = $scope.temp.page.clouds.findIndex(c=>{
					return c.id == cloud.id
				})
				$scope.temp.page.clouds.splice(i, 1)
			},
			associated: function(cloud){
				var id = cloud && cloud.id;
				return $scope.temp.page && $scope.temp.page.clouds && $scope.temp.page.clouds.findIndex(c=>{return c.id == id;}) != -1;
			},
			save: function(cloud){
				if(cloud){
					var cloud = angular.copy(cloud);
					cloud.id = cloud.id || cloud.$id;
					tools.cloud.addHistory(cloud);
					cloud.code = $scope['ccEditor'].getValue();
					cloud.state = tools.ace.state($scope['ccEditor']);

					delete cloud.$id;
					delete cloud.$priority;
					
					if(cloud.global)
						var cloudRef = firebase.database().ref('project/private/cloud').child(cloud.id);
					else
						var cloudRef = firebase.database().ref('project/'+$routeParams.view+'/cloud').child(cloud.id);
					
					cloudRef.set(cloud).then(function(){
						$scope.edits++;
					})
					if(cloud.global)
						tools.cloud.add(cloud);
				}
			},
			delete: function(cloud){
				if(confirm('If other pages rely on this cloud they will break.  Are you sure you want to delete this cloud?')){
					if(cloud.global){
						tools.cloud.remove(cloud);
						var cloudRef = firebase.database().ref('project/private/cloud').child(cloud.id);
					}else{
						var cloudRef = firebase.database().ref('project/'+$routeParams.view+'/cloud').child(cloud.id);
					}
					cloudRef.remove();
				}
			},
			path: function(cloud = {}){
				if(cloud.global)
					return config.origin+'/project/cloud/'+cloud.id;
				else
					return config.origin+'/project/'+$routeParams.view+'/cloud/'+cloud.id;
			},
			get: function(id){
				//return url for ng-include.  if in edit, return dynamic url.
				var suffix = '';
				if($scope.edits)
					suffix = '?test='+$scope.edits;
				//project/:uid/cloud/:cloudId
				if(id.indexOf('/') != -1){
					id = id.replace('/', '');
					return config.origin+'/project/cloud/'+id+suffix;
				}else{
					return config.origin+'/project/'+$routeParams.view+'/cloud/'+id+suffix;
				}
			}
		},
		ace: {
			focus: function(editor){
				let code, mode, state;
				if($scope[editor])
					code = $scope[editor].getValue();
				
				if(editor == 'htmlEditor'){
					mode = 'ace/mode/html';
					code = code || $scope.temp.page.html;
					state = $scope.temp.page.htmlState;
				}else if(editor == 'jsEditor'){
					mode = 'ace/mode/javascript';
					code = code || $scope.temp.page.js;
					state = $scope.temp.page.jsState;
				}
				
				tools.ace.setup(editor, code, mode, state);
			},
			state: (editor, state)=>{
				var session = editor.session;
				if(state){
					session.selection.fromJSON(state.selection)
					try {
						state.folds.forEach(function(fold){
							let range = ace.Range.fromPoints(fold.start, fold.end);
							session.addFold(fold.placeholder, range);
						});
					} catch(e) {}
					session.setScrollTop(state.scrollTop)
					session.setScrollTop(state.scrollLeft)
				}else{
					let state = {};
					state.selection = session.selection.toJSON()
					state.folds = session.getAllFolds().map(function(fold) {
						return {
							start       : fold.start,
							end         : fold.end,
							placeholder : fold.placeholder
						};
					});
					state.scrollTop = session.getScrollTop()
					state.scrollLeft = session.getScrollLeft()
					
					return JSON.parse(JSON.stringify(state));
				}
			},
			setup: function(editor, code, mode, state){
				$scope.editor = $scope[editor] = ace.edit(editor);
				$scope[editor].setTheme("ace/theme/monokai");
				$scope[editor].setOption('useSoftTabs', false);
				
				$scope[editor].getSession().setMode(mode);
				$scope[editor].setValue(code, -1);
				tools.ace.state($scope[editor], state);

				$scope[editor].commands.addCommand({
					name: 'save',
					bindKey: {win: 'Ctrl-s', mac: 'Command-s'},
					exec: function(editor) {
						tools.edit.save(true);
					},
					readOnly: true
				});
				$scope[editor].commands.addCommand({
						name: 'openComponentTray',
						bindKey: {
						win: 'Ctrl-Enter',
						mac: 'Command-Enter',
						sender: 'editor|cli'
					},
					exec: function(env, args, request) {
						tools.snippet.init();
					}
				});
			}
		},
		img: {
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
			browse: function(ev){
				var defer = $q.defer();
				$mdDialog.show({
					scope: $scope,
					preserveScope: true,
					templateUrl: '/component/imgBrowse.html',
					parent: angular.element(document.body),
					targetEvent: ev,
					clickOutsideToClose: true,
					multiple: true,
					onComplete: function(){
						
					}
				}).then(function(imgUrl){
					imgUrl = imgUrl.replace('https://pixabay.com/get/', 'https://res.cloudinary.com/'+config.cloudinary.cloudName+'/image/upload/pixel/')
					defer.resolve(imgUrl);
				})
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
			use: function(imgUrl){
				$mdDialog.hide(imgUrl);
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
				validate:	'https://a.alphabetize.us/project/code/cloud/code/iZTQIVnPzPW7b2CzNUmO;WAEzasxjWZSggmwP3MER;addon-validate.dialog',
				browse: 	'https://a.alphabetize.us/project/code/cloud/code/iZTQIVnPzPW7b2CzNUmO;WAEzasxjWZSggmwP3MER;addon-browse.dialog',
				dev:		'https://a.alphabetize.us/project/code/cloud/code/iZTQIVnPzPW7b2CzNUmO;WAEzasxjWZSggmwP3MER;addon-dev.dialog',
				view:		'https://a.alphabetize.us/project/code/cloud/code/iZTQIVnPzPW7b2CzNUmO;WAEzasxjWZSggmwP3MER;addon-view.dialog',
			},
			init: (list)=>{
				tools.addon._list = list;
				tools.addon._invalidList = [];
				$scope.addon = $scope.addon || {};
				list.forEach(m=>{
					if(!m.$ignore){
						tools.addon.verify(m).then(r=>{
							tools.addon.load(r);
						}).catch(e=>{
							if(tools.addon._invalidList.length == 0)
								tools.dialog(tools.addon.dialogs.validate)
							tools.addon._invalidList.push(m);
						})
					}
				})
			},
			verify: manifest=>{ //verifies addon integrity (signature) before running.
				return new Promise((res, rej)=>{
					let publicKey = pathValue($scope, 'page.publicKey') || tools.validate._publicKey;
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
				$scope.addon = $scope.addon || {};
				try{
					return $http.get(manifest.url).then(r=>{
						let addon = r.data;
						if(typeof r.data == 'string'){
							addon = (function(str){
								return eval(str)
							})(addon)
						}else{
							addon.meta.url = manifest.url;
						}
						if(addon){
							if(!$scope.addon[addon.meta.name]){
								$scope.addon[addon.meta.name] = addon;
								$scope.addon[addon.meta.name].init && $scope.addon[addon.meta.name].init(api);
								manifest.$installed = true;
							}else{
								console.error(`Addon with the name: ${addon.meta.name} already exists.`)
							}
							return addon;
						}else{
							console.info(`The addon at: ${url} could not be loaded.`)
						}
					})
				}catch(e){
					console.log('--THERE WAS AN ERROR LOADING THE FOLLOWING ADDON', manifest)
					console.log(e);
				}
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
				addon.$installed	= true;
				addon.installId 	= addon.installId || tools.addon.genId(addon);
				addon.installedOn	= new Date();
				addon.installedBy	= $scope.user.uid;
				addon.createdBy		= addon.createdBy || $scope.user.uid;
				tools.addon.load(addon);
				api.broadcast('addon.install', addon);
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
								return eval(str)
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
					return Promise.all([
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
					privateKey = tools.validate.keys.import('public', privateKey);
				else
					privateKey = Promise.resolve(privateKey);
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
					publicKey = Promise.resolve(publicKey);
				return publicKey.then(pk=>{
					return crypto.subtle.verify({
						name: "RSA-PSS",
						saltLength: 32,
					}, pk, tools.validate.b642a(signature), doc);	
				})
			}
		}
	}

	Auth.on('any', (user)=>{
		$scope.user = user;
		tools.init(Auth.status);
	})
	it.ProjCtrl = $scope;
});
