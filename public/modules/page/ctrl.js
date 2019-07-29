/*global angular, app, firebase, Mousetrap, moment*/

app.lazy.controller('PageCtrl', function PageCtrl($scope, $firebaseObject, $firebaseArray, $mdMedia, $mdDialog, $mdSidenav, $mdBottomSheet, $mdToast, $routeParams, $http, $sce, $q, $location, Auth, Fire, Cloudinary, Stripe, config){
	$scope.$mdDialog	= $mdDialog;
	$scope.cloudinary	= Cloudinary;
	$scope.moment		= moment;
	$scope.temp = {};
	$scope.data = {};
	var route		= $routeParams.view || 'default';
	var db			= firebase.firestore();
	db.settings({timestampsInSnapshots: true});
	var pageRef 	= firebase.database().ref("site/public/pages").child(route);
	var historyRef	= firebase.database().ref("site/private/historicPages").child(route);
	var snapshotRef = firebase.database().ref("site/public/snapshots").child(route);
	var templateRef = firebase.database().ref("site/public/pageTemplates");
	var page = $firebaseObject(pageRef);
		page.$bindTo($scope, "page");
	
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
		init: function(){
			page.$loaded(function(page){
				tools.render(page)
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
		edit: {
			init: function(){
				tools.history.init();
				tools.snapshot.init();
				$scope.temp.page = angular.copy($scope.page);
				if(!$scope.temp.page.js)
					$scope.temp.page.js = 'js = {\n\tinit: function(){\n\t\t\n\t}\n}'
				if(!$scope.temp.page.html)
					$scope.temp.page.html = '<h1>New Page</h1>'
				tools.edit.dialog()
			},
			dialog: function(){
				$scope.editSize = localStorage.getItem('editSize') || 60;
				$mdDialog.show({
					scope: $scope,
					preserveScope: true,
					templateUrl: 'modules/page/partials/editDialog.html',
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
			save: function(keepOpen){
				if($scope.jsEditor)
					$scope.temp.page.js = $scope.jsEditor.getValue();
				if($scope.htmlEditor)
					$scope.temp.page.html = $scope.htmlEditor.getValue();
				if($scope.inEdit == 'cEditor')
					tools.component.save();
				
				tools.history.add(angular.copy($scope.page));
				$scope.page = angular.copy($scope.temp.page)
				tools.render($scope.page)
				if(!keepOpen)
					$mdDialog.hide()
			},
			cancel: function(){
				$scope.temp.page = angular.copy($scope.page)
				$mdDialog.hide()
			},
			remove: function(){
				if(confirm('Are you sure you want to completly delete this page?')){
					page.$remove()
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
					if(refPath.indexOf('{uid}') == -1 && refPath.indexOf('{email}') == -1){
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
					}else{
						deferred.resolve('User Not Logged In');
					}
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
					var otitle = template.title;
					Object.keys($scope.temp.page).forEach(function(key){
						if(key.indexOf('$') == -1)
							template[key] = $scope.temp.page[key] || null;
					})
					template.title = otitle;
					$scope.templates.$save(template);
				}
			},
			remove: function(template){
				if(confirm('Are you sure you want to completly remove this template?'))
					$scope.templates.$remove(template);
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
			},
			loadHistory: function(id){
				var historyRef = firebase.database().ref("site/private/historicComponents").child(id);
				$scope.componentHistory = $firebaseArray(historyRef);
			},
			addHistory: function(id, historicComponent){
				//update ref just in case...
				var historyRef = firebase.database().ref("site/private/historicComponents").child(id);
				$scope.componentHistory = $firebaseArray(historyRef);
				$scope.componentHistory.$loaded(function(){
					historicComponent.archivedBy = $scope.user.uid;
					historicComponent.archivedOn = moment().toISOString();
					historicComponent.title = id;
					delete historicComponent.$id;
					delete historicComponent.$priority;
					$scope.componentHistory.$add(historicComponent);
					if($scope.componentHistory.length > 5)
						$scope.componentHistory.$remove(0);
				})
			},
			history: function(item){
				tools.component.set($scope.temp.componentId, item);
			},
			search: function(needle){
				//load relevant components from all components.
				$scope.inSearch = needle && needle.length;
				if(!$scope.components){
					var componentRef = firebase.database().ref("site/private/components");
					$scope.components = $firebaseArray(componentRef);
				}
				$scope.components.$loaded(function(){
					$scope.cSearchResults = $scope.components.filter(function(c){
						return c.$id.indexOf(needle) != -1;
					})
				})
			},
			focus: function(id){
				$scope.temp.componentId = id;
				var componentRef = firebase.database().ref("site/private/components").child(id);
				componentRef.once('value', function(snap){
					tools.component.set(id, snap.val());
				})
			},
			set: function(id, component){
				var editor = 'cEditor'
				tools.ace.setup(editor);
				delete component.$id;
				delete component.$priority;
				component = JSON.parse(angular.toJson(component));
				var component = $scope.temp.component = component || {code: ''};
				var code = component.code;
				var mime = {js: 'ace/mode/javascript', css: 'ace/mode/css'}
				var suffix = id.split('_')[id.split('_').length-1];
				var mode = mime[suffix] || 'ace/mode/html'
				$scope[editor].getSession().setMode(mode);
				$scope[editor].setValue(code, -1);
				tools.component.loadHistory(id);
			},
			cache: function(){
				$scope.temp.component = $scope.temp.component || {};
				var minutes = prompt('Enter cache time in minutes');
				if(minutes)
					$scope.temp.component.cache = Number(minutes) * 60 * 1000; 
			},
			add: function(){
				//adds specific component to page
				var id = $scope.temp.componentId
				$scope.temp.page.components = $scope.temp.page.components || [];
				$scope.temp.page.components.push(id);
			},
			remove: function(){
				//removes specific component from page
				if($scope.temp.page.components){
					var id = $scope.temp.componentId
					var i = $scope.temp.page.components.indexOf(id)
					$scope.temp.page.components.splice(i, 1)
				}
			},
			associated: function(){
				return $scope.temp.page && $scope.temp.page.components && $scope.temp.page.components.indexOf($scope.temp.componentId) != -1;
			},
			save: function(){
				//saves component content
				var id = $scope.temp.componentId;
				tools.component.addHistory(id, angular.copy($scope.temp.component));
				$scope.temp.component.code = $scope['cEditor'].getValue();
				var componentRef = firebase.database().ref("site/private/components").child(id);
					componentRef.set($scope.temp.component).then(function(){
						$scope.edits++;
					})
			},
			delete: function(){
				if(confirm('If other pages rely on this component they will break.  Are you sure you want to delete this component?')){
					var id = $scope.temp.componentId;
					tools.component.remove();
					var componentRef = firebase.database().ref("site/private/components").child(id);
						componentRef.remove().then(function(){
							tools.component.remove();
						})
				}
			},
			get: function(id){
				//return url for ng-include.  if in edit, return dynamic url.
				var suffix = '';
				if($scope.edits)
					suffix = '?test='+$scope.edits;
				return config.origin+'/component/'+id+suffix;
			}
		},
		ace: {
			focus: function(editor){
				if($scope.inEdit == 'htmlEditor' && $scope.htmlEditor.getValue())
					$scope.temp.page.html = $scope.htmlEditor.getValue();
				if($scope.inEdit == 'jsEditor' && $scope.jsEditor.getValue())
					$scope.temp.page.js = $scope.jsEditor.getValue();
				
				tools.ace.setup(editor);
				
				
				if(editor == 'htmlEditor'){
					$scope[editor].getSession().setMode("ace/mode/html");
					$scope[editor].setValue($scope.temp.page.html, -1);
				}else if(editor == 'jsEditor'){
					$scope[editor].getSession().setMode("ace/mode/javascript");
					$scope[editor].setValue($scope.temp.page.js, -1);
				}
			},
			setup: function(editor){
				$scope.inEdit = editor;
				
				$scope[editor] = ace.edit(editor);
				$scope[editor].setTheme("ace/theme/monokai");
				$scope[editor].setOption('useSoftTabs', false);
				
				$scope[editor].commands.addCommand({
					name: 'save',
					bindKey: {win: 'Ctrl-s', mac: 'Command-s', sender: 'editor|cli'},
					exec: function(editor) {
						tools.edit.save(true);
					},
					readOnly: true
				});
				$scope[editor].commands.addCommand({
					name: 'snippet',
					bindKey: {win: 'Ctrl-i', mac: 'Command-i', sender: 'editor|cli'},
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
					}, function() {
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
				$scope.temp.imgPage = 1;
				$http.get('cloud/pixel?min_width=1500&response_group=high_resolution&per_page=80&q='+term).then(function(r){
					$scope.temp.imgSearchResults = r.data.hits;
				})
			},
			load: function(term){
				var term = $scope.temp.imgSearchTerm;
				var page = ++$scope.temp.imgPage;
				$http.get('cloud/pixel?min_width=1500&response_group=high_resolution&per_page=80&page='+page+'&q='+term).then(function(r){
					$scope.temp.imgSearchResults = [...$scope.temp.imgSearchResults, ...r.data.hits];
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
	tools.init();
	
	it.PageCtrl = $scope;
});