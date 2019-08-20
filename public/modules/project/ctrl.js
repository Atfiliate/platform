/*global angular, app, firebase, Mousetrap, moment, whois*/

app.lazy.controller('ProjCtrl', function ProjCtrl($scope, $firebaseObject, $firebaseArray, $mdMedia, $mdDialog, $mdSidenav, $mdBottomSheet, $mdToast, $routeParams, $http, $sce, $q, $location, 
Auth, Cloudinary, Stripe, Fire, config){
	$scope.$mdDialog	= $mdDialog;
	$scope.cloudinary	= Cloudinary;
	$scope.moment		= moment;
	$scope.temp = {};
	$scope.data = {};
	var projectId = $routeParams.view || 'default';
	var page,pageRef,templateRef,historyRef,snapshotRef,db;
	Auth().then(function(user){
		db				= firebase.firestore();
		db.settings({timestampsInSnapshots: true});
		pageRef 		= firebase.database().ref('project/'+projectId).child('page');
		templateRef 	= firebase.database().ref("site/public/pageTemplates");
		historyRef		= firebase.database().ref('project/'+projectId+'/historicPages');
		snapshotRef 	= firebase.database().ref('project/'+projectId+'/snapshots');
		page = $firebaseObject(pageRef);
		page.$bindTo($scope, "page");
		tools.init(page);
	})
	
	if(config.mixpanel)
		mixpanel.track(
			"page",
			{view: $routeParams.view, id:$routeParams.id}
		);
	document.title = $routeParams.view;
		
	Mousetrap.bind('ctrl+e', function(e){
		e.preventDefault();
		tools.edit.init();
	})
	Mousetrap.bind('ctrl+s', function(e){
		e.preventDefault();
		tools.edit.save();
	})
	Mousetrap.bind('ctrl+i', function(e){
		e.preventDefault();
		tools.ace.snip();
	})
		
	var tools = $scope.tools = {
		init: function(page){
			page.$loaded(function(page){
				tools.render(page)
				document.title = page.title;
			})
		},
		alert: function(message){
			$mdToast.show(
			$mdToast.simple()
				.textContent(message)
				.hideDelay(5000)
			);
		},
		dialog: function(dialog){
			if(dialog.indexOf('http') != -1)
				dialog = $sce.trustAsResourceUrl(dialog);
			else
				dialog = tools.component.get(dialog);
			$mdDialog.show({
				scope: $scope,
				preserveScope: true,
				templateUrl: dialog,
				multiple: true,
				parent: angular.element(document.body),
				clickOutsideToClose: true
			})
		},
		copy: function(txtToCopy){
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
				tools.alert('Coppied To Clipboard');
			}
		},
		//Tab, Save location, extra settings (history)
		edit: {
			init: function(){
				tools.history.init();
				tools.snapshot.init();
				$scope.temp.page = angular.copy($scope.page);
				if(!$scope.temp.page.js)
					$scope.temp.page.js = 'js = {\n\tinit: function(){\n\t\t\n\t}\n}'
				if(!$scope.temp.page.html)
					$scope.temp.page.html = '<h1>New Page</h1>'

				$scope.editors = {
					jsEditor: (editor)=>{
						$scope.temp.page.js = $scope.jsEditor.getValue();
						$scope.temp.page.jsState = tools.edit.state(editor);
					},
					htmlEditor: (editor)=>{
						$scope.temp.page.html = $scope.htmlEditor.getValue();
						$scope.temp.page.htmlState = tools.edit.state(editor);
					},
					cEditor: (editor)=>{
						$scope.temp.component.state = tools.edit.state(editor);
						tools.component.save($scope.temp.component);
					},
					ccEditor: (editor)=>{
						$scope.temp.cloud.state = tools.edit.state(editor);
						tools.cloud.save($scope.temp.cloud);
					}
				}
				tools.edit.dialog()
			},
			dialog: function(){
				$scope.editSize = localStorage.getItem('editSize') || 60;
				$mdDialog.show({
					scope: $scope,
					preserveScope: true,
					templateUrl: 'modules/project/partials/editDialog.html',
					parent: angular.element(document.body),
					clickOutsideToClose: true,
					fullscreen: true,
					onComplete: function(){
						tools.edit.size($scope.editSize);
					}
				});
			},
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
			data: function(key){
				if(key){
					delete $scope.temp.page.data[key];
				}else{
					$scope.temp.page.data = $scope.temp.page.data || {};
					$scope.temp.page.data[$scope.temp.data.alias] = angular.copy($scope.temp.data)
					$scope.temp.data = {};
				}
			},
			
			state: (editor, state)=>{
				var session = editor.session;
				if(state){
					session.selection.fromJSON(state.selection)
					try {
						state.folds.forEach(function(fold){
							session.foldAll(fold.start.row, fold.end.row)
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
		render: function(page){
			var promises = [];
			if(page.data)
				promises = Object.keys(page.data).map(function(key){
					var ref = page.data[key];
					var deferred = $q.defer();
					var refPath = ref.path
					if($scope.user){
						refPath = refPath.replace('{{uid}}', $scope.user.uid);
						refPath = refPath.replace('{{email}}', $scope.user.email);
					}
					Object.keys($scope.params).forEach(key=>{
						refPath = refPath.replace('{{'+key+'}}', $scope.params[key]);
					})

					var dataRef = firebase.database().ref().child(refPath);
					if(ref.array)
						$scope.data[ref.alias] = $firebaseArray(dataRef);
					else
						$scope.data[ref.alias] = $firebaseObject(dataRef);
					$scope.data[ref.alias].$loaded(function(obj){
						deferred.resolve(obj)
					}, function(e){
						deferred.resolve(e)
					})
					return deferred.promise;
				})
			if(page.js)
				$q.all(promises).then(function(r){
					try{
						var js;
						eval('js = $scope.js = '+page.js)
						if(js.init)
							$scope.data = js.init($scope.data) || $scope.data;
					}catch(e){
						$http.post('cloud/log', {
							url:		window.location.href,
							user:		($scope.user && $scope.user.uid),
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
						console.error(e);
					}
				})
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
			init: function(){
				var view = $scope.params.view;
				var packageRef = whois.database().ref('whois/packages').child(view);
				$scope.packages = $firebaseArray(packageRef);
			},
			load: function(pkg){
				var view = $scope.params.view;
				var origId = pkg.$id;
				Object.keys(pkg).forEach(k=>{
					if(k.indexOf('$') != -1)
						delete pkg[k];
				})
				var packageRef = firebase.database().ref('project').child(view);
				pkg.origId = origId;
				packageRef.set(pkg).then(function(){
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
				tools.ace.setup('cEditor');
				$scope.temp.component = $scope.temp.component || {};
				$scope['cEditor'].getSession().setMode('ace/mode/html');
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
				tools.ace.setup(editor);
				component = JSON.parse(angular.toJson(component) || '{"code":""}');
				$scope.temp.component = component;
				var mime = {js: 'ace/mode/javascript', css: 'ace/mode/css'}
				var suffix = component.id.split('_')[component.id.split('_').length-1];
				var mode = mime[suffix] || 'ace/mode/html';
				$scope[editor].getSession().setMode(mode);
				$scope[editor].setValue(component.code || '', -1);
				tools.edit.state($scope['cEditor'], $scope.temp.component.state);
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
		},
		cloud: {
			init: function(){
				//load list of page-related clouds
				$scope.inEdit = 'ccEditor';
				$scope.edits = $scope.edits || 0;
				tools.ace.setup('ccEditor');
				$scope.temp.cloud = $scope.temp.cloud || {};
				$scope['ccEditor'].getSession().setMode('ace/mode/html');
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
				tools.ace.setup(editor);
				cloud = JSON.parse(angular.toJson(cloud) || '{"code":"js={\n\tinit: function(request, response){\n\t\t\n\t}\n}"}');
				$scope.temp.cloud = cloud;
				var mode = 'ace/mode/javascript';
				$scope[editor].getSession().setMode(mode);
				$scope[editor].setValue(cloud.code || '', -1);
				tools.edit.state($scope['cEditor'], $scope.temp.component.state);
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
				let code = "";
				if($scope[editor])
					code = $scope[editor].getValue();
				
				tools.ace.setup(editor);
				if(!$scope[editor]){
					if(editor == 'htmlEditor'){
						$scope[editor].getSession().setMode("ace/mode/html");
						$scope[editor].setValue(code || $scope.temp.page.html, -1);
						tools.edit.state($scope[editor], $scope.temp.page.htmlState);
					}else if(editor == 'jsEditor'){
						$scope[editor].getSession().setMode("ace/mode/javascript");
						$scope[editor].setValue(code || $scope.temp.page.js, -1);
						tools.edit.state($scope[editor], $scope.temp.page.jsState);
					}
				}
			},
			setup: function(editor){
				$scope[editor] = ace.edit(editor);
				$scope[editor].setTheme("ace/theme/monokai");
				$scope[editor].setOption('useSoftTabs', false);
				
				$scope[editor].commands.addCommand({
					name: 'save',
					bindKey: {win: 'Ctrl-s', mac: 'Command-s'},
					exec: function(editor) {
						tools.edit.save(true);
					},
					readOnly: true
				});
				$scope[editor].commands.addCommand({
					name: 'snippet',
					bindKey: {win: 'Ctrl-i', mac: 'Command-i'},
					exec: function(editor) {
						tools.ace.snip();
					},
					readOnly: true
				});
			},
			snip: function(){
				var editor = $scope[$scope.inEdit];
				var selection = editor.getSelectedText();
				if(!!selection){
					//save selection
					var prompt = $mdDialog.prompt()
						.title('Save Code Snippet')
						.textContent('Enter a name for this snippet (do not use [[]] brackets, spaces or special chars) _ and - are allowed.')
						.placeholder('random-cool-element || awesomeFunction')
						.ariaLabel('Snippet name')
						.multiple(true)
						.ok('Save!')
						.cancel('Cancel');
					
					$mdDialog.show(prompt).then(function(snipTitle) {
						if(snipTitle.length){
							var snipRef = firebase.database().ref("site/public/codeSnippet").child(snipTitle);
								snipRef.set({
									code: selection
								})
							alert('You can now use this snippet with: [['+snipTitle+']] and pressing ctrl+i')
						}
					}, function(){
						//Canceled saving...
					});
				}else{
					//load selection options
					var snipTitle = editor.getValue().split('\n')[editor.getCursorPosition().row].split('[[')[1].split(']]')[0];
					if(snipTitle){
						var snipRef = firebase.database().ref("site/public/codeSnippet").child(snipTitle);
						snipRef.on("value", function(snapshot) {
							var code = snapshot.val().code;
							editor.replace(code, {needle:'[['+snipTitle+']]'})
						})
					}else{
						alert('No snippet syntax found.')
					}
				}
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
		
		toggleSide: function(id){
			$mdSidenav(id).toggle()
		},
	}
	
	it.ProjCtrl = $scope;
});