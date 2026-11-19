edit = {
	meta: {
		name:			"edit",
		version:		"1.2",
		title:			"edit",
		description:	"Edit this project.",
		url:			"/core/project-edit.js"
	},
	
	init: function(){
		let cedit = $scope.edit || {};
		$scope.edit = {};
		$scope.edits = $scope.edits || 0;
		// $scope.editSize = localStorage.getItem('editSize') || 60;
		
		Mousetrap.bind('ctrl+s', function(e){
			e.preventDefault();
			edit.variation.save();
		})
		if(!edit.$init){
			edit.$init=true;
			api.register("edit-sideFeature", {
				title:		'Edit Market',
				idx:		10,
				tabs:		['library'],
				template:	`/core/edit-market.side`
			});
			
			api.register("edit-sideFeature", {
				title:		'Edit Components',
				idx:		10,
				tabs:		['components'],
				template:	`
				<md-toolbar class="md-hue-2">
					<div class="md-toolbar-tools">
						<h2 flex md-truncate>Components</h2>
						<md-button class="md-icon-button" aria-label="Add" ng-click="addon.edit.component.add()"><i class="fa fa-plus"></i></md-button>
					</div>
				</md-toolbar>
				<div layout-padding>
					<md-input-container class="md-block">
						<label>Search</label>
						<input ng-model="temp.compSearch" ng-change="addon.edit.search(edit.project.component, temp.compSearch)">
					</md-input-container>
				</div>
				<md-list>
					<md-list-item layout="row" ng-repeat="component in edit.$components | orderBy:'id'" ng-show="!temp.compSearch || component.$found" flex ng-click="addon.edit.component.focus(component)">
						<span><i class="fa fa-search" ng-show="component.$found"></i>&nbsp;{{component.id}}</span>
						<md-button class="md-secondary md-icon-button" aria-label="Remove {{component.id}}" ng-click="addon.edit.component.delete(component)">
							<i class="fa fa-trash"></i>
						</md-button>
					</md-list-item>
				</md-list>`
			});
			
			api.register("edit-sideFeature", {
				title:		'Edit Cloud Code',
				idx:		10,
				tabs:		['cloud'],
				template:	`
					<md-toolbar class="md-hue-2">
						<div class="md-toolbar-tools">
							<h2 flex md-truncate>Cloud Code</h2>
							<md-button class="md-icon-button" aria-label="Add" ng-click="addon.edit.cloud.add()"><i class="fa fa-plus"></i></md-button>
						</div>
					</md-toolbar>
					<div layout-padding>
						<md-input-container class="md-block">
							<label>Search</label>
							<input ng-model="temp.cloudSearch" ng-change="addon.edit.search(edit.project.cloud, temp.cloudSearch)">
						</md-input-container>
					</div>
					<md-list>
						<md-list-item layout="row" ng-repeat="cloud in edit.$clouds | orderBy:'id'" flex ng-click="addon.edit.cloud.focus(cloud)">
							<span><i class="fa fa-search" ng-show="cloud.$found"></i>&nbsp;{{cloud.id}}</span>
							<md-button class="md-secondary md-icon-button" aria-label="Remove {{cloud.id}}" ng-click="addon.edit.cloud.delete(cloud)">
								<i class="fa fa-trash"></i>
							</md-button>
						</md-list-item>
					</md-list>`
			});
		}
		
		
		
		new Fire(`dev`).where('projectId', '==', $scope.params.view).get().then($variations=>{
			$variations.forEach(r=>pathValue(r, 'page.vid', r.id));
			$scope.edit.$variations	= $variations;
			$scope.edit.project 	= $variations.find(r=>r.id == $scope.params.v || r.id == $scope.page.vid);
			$scope.edit.orig		= Fire.prepare($scope.edit.project);
			if(!$scope.edit.project){
				tools.alert(`This doesn't exist, would you like to create it now?`, 'Yes').then(()=>{
					edit.variation.add();	
				})
			}else{
				$scope.edit.$components = Object.values($scope.edit.project.component||{});
				$scope.edit.$clouds = Object.values($scope.edit.project.cloud||{});
				$scope.editors = {
					jsEditor: (editor)=>{
						pathValue($scope, 'edit.project.page.js', $scope.jsEditor.getValue());
						pathValue($scope, 'edit.project.page.jsState', edit.ace.state(editor));
					},
					htmlEditor: (editor)=>{
						pathValue($scope, 'edit.project.page.html', $scope.htmlEditor.getValue());
						pathValue($scope, 'edit.project.page.htmlState', edit.ace.state(editor));
					},
					cEditor: (editor)=>{
						pathValue($scope, 'edit.component.code', $scope.cEditor.getValue());
						pathValue($scope, 'edit.component.state', edit.ace.state(editor));
						// $scope.temp.component.state = edit.ace.state(editor);
						// if($scope.temp.component && $scope.temp.component.id)
						// 	edit.component.save($scope.temp.component);
					},
					ccEditor: (editor)=>{
						pathValue($scope, 'edit.cloud.code', $scope.ccEditor.getValue());
						pathValue($scope, 'edit.cloud.state', edit.ace.state(editor));
						// $scope.temp.cloud.state = edit.ace.state(editor);
						// if($scope.temp.cloud && $scope.temp.cloud.id)
						// 	edit.cloud.save($scope.temp.cloud);
					}
				}
				tools.dialog('/core/edit.dialog', {
					onComplete: function(){
						edit.size($scope.edit.size);
						console.log(cedit);
						if(cedit.component){
							let c = pathValue($scope, `edit.project.component[${cedit.component.id}]`);
							if(c)
								edit.component.focus(c);
						}
						if(cedit.cloud){
							let c = pathValue($scope, `edit.project.cloud[${cedit.cloud.id}]`);
							if(c)
								edit.cloud.focus(c);
						}
					}
				})
			}
		})
		
		// edit.ace.customize();
		edit.browse.init();
	},
	size: function(size){
		var height = window.innerHeight - 400;
		$('.dynaSize').css("height", height);
		$('.dynaSize').css("max-height", height);
		window.dispatchEvent(new Event('resize'));
	},
	tab: label=>{
		edit.$tab = label;
		api.broadcast('edit.tab', label);
	},
	sync: ()=>{
		Object.keys($scope.editors).forEach(editorId=>{
			if($scope[editorId]){
				$scope.editors[editorId]($scope[editorId])
			}
		})
	},
	notify: (proj)=>{
		$http.post(`/project/admin/cloud/package`, {
			update: {
				origin: 		window.location.origin,
				projectId:		proj.projectId,
				variationId:	proj.id
			}
		})
	},
	cancel: function(){
		$scope.temp.page = Fire.prepare($scope.page)
		$mdDialog.hide()
	},
	delete: function(){
		if(confirm('This will delete this project and all associated components and cloud code.')){
			api.act('_project.delete', ()=>{
				$scope.edit.project.$fire.delete();
				tools.render({});
				$mdDialog.hide();
				tools.alert('Project Deleted.');
			}, ()=>{
				$scope.edit.project.$fire.save();
				tools.render($scope.edit.project.page);
				tools.alert('Project Restored.');
			})
		}
	},
	search: (obj, attr)=>{
		Object.keys(obj).forEach(k=>{
			let copy = Fire.prepare(obj[k]);
				copy = JSON.stringify(copy);
				if(copy.includes(attr))
					obj[k].$found = true;
				else
					obj[k].$found = false;
		})
	},
	snippet: {
		init: ()=>{
			edit.snippet.templates();
			$mdBottomSheet.show({
				parent: 		'#project-settings',
				templateUrl:	$sce.trustAsResourceUrl('/core/project-component.sheet'),
				scope:			$scope,
				preserveScope:	true
			})
		},
		templates: (reload)=>{
			let suffix = $scope.editor.session.getMode().$id == 'ace/mode/javascript' ? '.js' : '.html'
			if(reload || !edit.snippet._list){
				let path = pathValue($scope, 'temp.page.snippetRef') || 'https://a.alphabetize.us/#/project/code/gThh06um8VuYE2qsCIQf?projectId=qOBhK4TMzSy3JsnNvKTH';
				path = path.split('?');
				let gid = path[0].split('/').pop();
				let pid = path[1].split('projectId=')[1];
				$http.get(`https://a.alphabetize.us/project/code/cloud/list?gid=${gid}&pid=${pid}`).then(r=>{
					edit.snippet._list = r.data;
					$scope.temp.snippets = edit.snippet._list.filter(s=>s.id.indexOf(suffix) != -1)
				})
			}else{
				$scope.temp.snippets = edit.snippet._list.filter(s=>s.id.indexOf(suffix) != -1)
			}
		},
		select: snippet=>{
			let editor = $scope.editor;
			editor.session.insert(editor.getCursorPosition(), snippet.code)
			$mdBottomSheet.hide();
		}
	},
	variation: {
		add: ()=>{
			let varTitle = $scope.edit.$variations ? `V${$scope.edit.$variations.length}` : 'Default';
			let isFirst = !pathValue($scope, 'edit.$variations.length');
			$scope.edit.$variations.$fire.add({
				default:	isFirst,
				page:		{
					title:		$scope.page.title || $scope.params.view
				},
				projectId:	$scope.params.view,
				stage:		isFirst ? 'prod' : 'dev',
				var:		{
					title:	varTitle
				}
			}).then(r=>{
				edit.variation.edit(r);
			})
		},
		promote: (v, to)=>{
			if(to == 'new'){
				let copy = Fire.prepare(v);
				delete copy.id;
				delete copy.$fire;
				delete copy.createdOn;
				delete copy.updatedOn;
				copy.projectId = $scope.params.view;
				copy.stage = 'dev';
				copy.default = false;
				copy.var = copy.var || {};
				copy.var.title = copy.var.title || pathValue(copy, 'page.title') || 'New Variation';
		
				$scope.edit.$variations.$fire.add(copy).then(saved=>{
					edit.notify(saved);
					edit.variation.edit(saved);
				});
			}else if(to == 'upgrade'){
				v.stage = 'prod';
				v.$fire.save().then(r=>{
					edit.notify(v);
					edit.variation.edit(v);
				})
			}else{
				// ----------------------------------------------------------
				// Existing behavior: promote into an existing target variation
				// ----------------------------------------------------------
				pathValue(v, 'var.title', pathValue(to, 'var.title'));
				pathValue(v, 'var.template', v.id);
		
				to.$fire.update({
					page:		v.page || null,
					cloud:		v.cloud || null,
					component:	v.component || null,
					var:		v.var
				}).then(r=>{
					edit.notify(to);
					edit.variation.edit(to);
				})
			}
		},
		// promote: (v, to)=>{
		// 	if(to == 'new'){
		// 		v.stage = 'prod';
		// 		v.$fire.save().then(r=>{
		// 			edit.notify(v);
		// 			edit.variation.edit(v);
		// 		})
		// 	}else{
		// 		pathValue(v, 'var.title', pathValue(to, 'var.title'));
		// 		pathValue(v, 'var.template', v.id);
		// 		to.$fire.update({
		// 			page:		v.page || null,
		// 			cloud:		v.cloud || null,
		// 			component:	v.component || null,
		// 			var:		v.var
		// 		}).then(r=>{
		// 			edit.notify(to);
		// 			edit.variation.edit(to);
		// 		})
		// 	}
		// },
		default: (v=>{
			v.default = true;
			v.$fire.save().then(r=>{
				tools.alert('Set As Default')
				$scope.edit.$variations.forEach(ov=>{
					if(ov.default && ov.id != v.id){
						ov.default = false;
						ov.$fire.save();
					}	
				})
			})
			
		}),
		diff: (v1, v2, path='page.js')=>{
			let leftText = String(pathValue(v1, path) || '');
			let rightText = String(pathValue(v2, path) || '');
		
			let leftLines = leftText.replace(/\r\n/g, '\n').split('\n');
			let rightLines = rightText.replace(/\r\n/g, '\n').split('\n');
		
			let buildMatrix = (a, b)=>{
				let m = Array.from({length: a.length + 1}, ()=>Array(b.length + 1).fill(0));
				for(let i = a.length - 1; i >= 0; i--){
					for(let j = b.length - 1; j >= 0; j--){
						m[i][j] = a[i] === b[j]
							? m[i + 1][j + 1] + 1
							: Math.max(m[i + 1][j], m[i][j + 1]);
					}
				}
				return m;
			};
		
			let matrix = buildMatrix(leftLines, rightLines);
		
			let ops = [];
			let i = 0;
			let j = 0;
		
			while(i < leftLines.length && j < rightLines.length){
				if(leftLines[i] === rightLines[j]){
					ops.push({
						type: 'equal',
						leftLine: i + 1,
						rightLine: j + 1,
						left: leftLines[i],
						right: rightLines[j]
					});
					i++;
					j++;
				}else if(matrix[i + 1][j] >= matrix[i][j + 1]){
					ops.push({
						type: 'remove',
						leftLine: i + 1,
						rightLine: null,
						left: leftLines[i],
						right: ''
					});
					i++;
				}else{
					ops.push({
						type: 'add',
						leftLine: null,
						rightLine: j + 1,
						left: '',
						right: rightLines[j]
					});
					j++;
				}
			}
		
			while(i < leftLines.length){
				ops.push({
					type: 'remove',
					leftLine: i + 1,
					rightLine: null,
					left: leftLines[i],
					right: ''
				});
				i++;
			}
		
			while(j < rightLines.length){
				ops.push({
					type: 'add',
					leftLine: null,
					rightLine: j + 1,
					left: '',
					right: rightLines[j]
				});
				j++;
			}
		
			let changes = [];
			for(let k = 0; k < ops.length; k++){
				let cur = ops[k];
				let next = ops[k + 1];
		
				if(cur.type === 'remove' && next && next.type === 'add'){
					changes.push({
						type: 'modify',
						leftLine: cur.leftLine,
						rightLine: next.rightLine,
						left: cur.left,
						right: next.right,
						charDiff: (()=>{	
							let a = cur.left || '';
							let b = next.right || '';
							let start = 0;
							while(start < a.length && start < b.length && a[start] === b[start])
								start++;
		
							let endA = a.length - 1;
							let endB = b.length - 1;
							while(endA >= start && endB >= start && a[endA] === b[endB]){
								endA--;
								endB--;
							}
		
							return {
								prefix: a.slice(0, start),
								removed: a.slice(start, endA + 1),
								added: b.slice(start, endB + 1),
								suffix: a.slice(endA + 1)
							};
						})()
					});
					k++;
				}else if(cur.type === 'remove'){
					changes.push({
						type: 'remove',
						leftLine: cur.leftLine,
						rightLine: null,
						left: cur.left,
						right: ''
					});
				}else if(cur.type === 'add'){
					changes.push({
						type: 'add',
						leftLine: null,
						rightLine: cur.rightLine,
						left: '',
						right: cur.right
					});
				}
			}
		
			let contextSize = 2;
			let hunks = [];
			let currentHunk = null;
		
			let flushHunk = ()=>{
				if(currentHunk && currentHunk.lines.length)
					hunks.push(currentHunk);
				currentHunk = null;
			};
		
			for(let idx = 0; idx < ops.length; idx++){
				let op = ops[idx];
				let isChange = op.type !== 'equal';
		
				if(isChange){
					if(!currentHunk){
						currentHunk = {
							leftStart: Math.max(1, (op.leftLine || (ops[idx - 1]?.leftLine || 1)) - contextSize),
							rightStart: Math.max(1, (op.rightLine || (ops[idx - 1]?.rightLine || 1)) - contextSize),
							lines: []
						};
		
						for(let back = Math.max(0, idx - contextSize); back < idx; back++){
							if(ops[back].type === 'equal'){
								currentHunk.lines.push(ops[back]);
							}
						}
					}
		
					currentHunk.lines.push(op);
		
					let trailingEquals = 0;
					for(let look = idx + 1; look < ops.length; look++){
						if(ops[look].type === 'equal'){
							trailingEquals++;
							if(trailingEquals <= contextSize)
								currentHunk.lines.push(ops[look]);
							if(trailingEquals > contextSize){
								idx = look - 1;
								break;
							}
						}else{
							trailingEquals = 0;
						}
		
						if(look === ops.length - 1)
							idx = look;
					}
		
					flushHunk();
				}
			}
		
			let summary = changes.reduce((acc, row)=>{
				acc.total++;
				acc[row.type] = (acc[row.type] || 0) + 1;
				return acc;
			}, {total: 0, add: 0, remove: 0, modify: 0});
		
			let result = {
				current: pathValue(v1, 'var.title') || v1.id,
				compare: pathValue(v2, 'var.title') || v2.id,
				path,
				leftLines: leftLines.length,
				rightLines: rightLines.length,
				changed: summary.total > 0,
				summary,
				changes,
				hunks,
				raw: ops
			};
		
			tools.alert(`Diff in console. ${summary.total} changes (${summary.add} added, ${summary.remove} removed, ${summary.modify} modified).`);
			console.log(result);
		
			return result;
		},
		compare: (v)=>{
			let newPkg = v;
			let oldPkg = Fire.prepare($scope.edit.project);
			let pkg1, pkg2;
			oldPkg.$title = 'Current';
			newPkg.$title = 'Compare';
			//we want merges to go to the middle (dev/stage)  at merge time, if we have a dev, we will save to that, otherwise, we will create a new merge project as a dev.
			//diff changes never go to prod.  They either save to an existing dev project or create a new one.
			if(newPkg.stage == 'dev' && oldPkg.stage != 'dev'){
				pkg1 = newPkg;
				pkg2 = oldPkg;
			}else{
				pkg1 = oldPkg;
				pkg2 = newPkg;
			}
			edit.package.analyze(pkg1, pkg2);
		},
		duplicate: (v, title)=>{
			let copy = Fire.prepare(v);
			delete copy.id;
			delete copy.createdOn;
			copy.projectId = $scope.params.view;
			copy.stage = 'dev';
			copy.default = false;
			copy.var = copy.var || {};
			copy.var.title = title || `Copy of: ${copy.var.title}`;
			$scope.edit.$variations.$fire.add(copy).then(r=>{
				api.broadcast('root.variation.created', r);
			})
		},
		edit: (v)=>{
			api.clear();
			let ab = JSON.parse(localStorage.getItem('ab')) || {};
			pathValue(ab, $routeParams.view, v.id);
			localStorage.setItem('ab', JSON.stringify(ab));
			let id = $scope.params.id ? `/${$scope.params.id}` : '';
			let url = new URL(window.location.href);
			url.searchParams.set('v', v.id);
			window.location = url.toString();
			// tools.render(v.page);
			// $mdDialog.hide();
			// edit.init();
		},
		save: ()=>{ //This pulls information from editors, so we should only update the current project.
			return new Promise(res=>{
				Object.keys($scope.editors).forEach(editorId=>{
					if($scope[editorId]){
						$scope.editors[editorId]($scope[editorId]);
						$scope.editors[editorId]
					}
				})
				
				let project = $scope.edit.project;
				new Fire(`dev/${project.id}`).get(null, true).then($remote=>{
					if(!$remote.versionId || $remote.versionId == project.versionId || confirm(`The versions do not match.  Saving this may overwrite previously made changes.  Are you sure you want to continue?`)){
						project.versionId = chance.md5();
						api.act('root.project.save', (project)=>{
							project.$fire.save().then(r=>{
								api.clear();
								// delete $scope.edit;
								// $scope.
								
								$scope.edits++;
								tools.alert('Project Saved.');
								tools.render(project.page);
								if(project.stage == 'prod')
									edit.notify(project);
								res();
							})
						}, null, project)
					}
				})
			})
		},
		delete: (v)=>{
			api.act('root.variation.delete', (v)=>{
				v.$fire.delete();
			}, (v)=>{
				v.$fire.save();
			}, v)
		}
	},
	browse: {
		init: ()=>{
			edit.browse.market();
		},
		view: (pkg)=>{
			$scope.package = pkg;
			tools.dialog('/core/project-market.dialog');
		},
		purchase: (pkg)=>{
			let copy = Fire.prepare(pkg);
			copy.template = pkg.id;
			delete copy.id;
			edit.variation.duplicate(pkg, `Purchase of: ${pkg.page.title}`);
			$mdDialog.hide();
		},
		market: ()=>{
			$scope.edit.browse = 'Market';
			$scope.$market = [];
			let db = whois.firestore();
			db.collection('share/whois/projects').where('_isPublic','==',true).limit(3).get().then(qs=>{
				console.log({qs})
				qs.forEach(doc=>{
					let p = doc.data();
						p.id = doc.id;
						p.title = pathValue(p, 'var.title');
					$scope.$market.push(Fire.clean(p));
				})
			})
		},
		local: ()=>{
			$scope.edit.browse = 'Local';
			new Fire('dev').where('stage','==','prod').get().then(r=>{
				r.forEach(o=>pathValue(o, 'meta.title', `${o.projectId}: ${pathValue(o, 'var.title') || pathValue(o, 'page.title') || 'Untitled'}`))
				$scope.$market = r;
			})
		},
		history: ()=>{
			// $scope.edit.browse = 'Local';
			// new Fire('dev').where('stage','==','prod').get().then(r=>{
			// 	r.forEach(o=>pathValue(o, 'meta.title', `${o.projectId}: ${pathValue(o, 'var.title') || pathValue(o, 'page.title') || 'Untitled'}`))
			// 	$scope.$market = r;
			// })
		},
		update: {
			toggle: ()=>{
				$scope.temp = $scope.temp || {};
				$scope.temp.showPairUpdates = !$scope.temp.showPairUpdates;
		
				if($scope.temp.showPairUpdates)
					edit.browse.update.list();
			},
			list: (force)=>{
				if(!force && $scope.edit.$updatesLoaded)
					return;
		
				$scope.edit.$updatesLoading = true;
				new Fire(`dev/list/updates`).where('projectId', '==', $scope.params.view).get().then(r=>{
					r.forEach(t=>t.$updatePair = true);
					$scope.edit.$updates = r;
					$scope.edit.$updatesLoaded = true;
				}).finally(()=>{
					$scope.edit.$updatesLoading = false;
				});
			},
			review: (u)=>{
				edit.variation.compare(u)
			},
			remove: (u)=>{
				u.$fire.delete();
				if($scope.edit.$updates)
					$scope.edit.$updates = $scope.edit.$updates.filter(x=>x.id != u.id);
			},
			removeAll: ()=>{
				if(confirm('Are you sure you want to delete all site pair updates.')){
					let updates = [...($scope.edit.$updates || [])];
					updates.forEach(u=>u.$fire.delete());
					$scope.edit.$updates = [];
				}
			}
		},
	},
	package: {
		analyze: (pkg1, pkg2)=>{
			let d = $scope.diff = {pkg1, pkg2};
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
			let l1 = JSON.stringify(pkg1.page.local || {})
			let l2 = JSON.stringify(pkg2.page.local || {})
			components.push({
				title:	'Local Config',
				type: 	'page',
				path:	'page.local',
				id: 	'js',
				p1: 	l1,
				p2: 	l2,
				v1: 	l1,
				v2: 	l2,
				change: (l1 != l2) ? 'change' : 'none',
				cout:	(str)=>{
					return JSON.parse(str);
				}
			})
			Object.keys({...pkg1.component, ...pkg2.component}).forEach(key=>{
				let p1c = pathValue(pkg1, `component[${key}].code`);
				let p2c = pathValue(pkg2, `component[${key}].code`);
				let canAdd = !p1c && !!p2c;
				let canRemove = !!p1c && !p2c;
				let hasChange = (p1c != p2c);
				let change = canAdd ? 'add' : canRemove ? 'remove' : hasChange ? 'change' : 'none';
				components.push({
					title:	`Component: ${key}`,
					type: 	'component',
					path:	`component[${key}].code`,
					id: 	key,
					p1: 	pkg1.component[key],
					p2: 	pkg2.component[key],
					v1: 	pathValue(pkg1, `component[${key}].code`),
					v2: 	pathValue(pkg2, `component[${key}].code`),
					change: change
				})
			})
			Object.keys({...pkg1.cloud, ...pkg2.cloud}).forEach(key=>{
				let p1c = pathValue(pkg1, `cloud[${key}].code`);
				let p2c = pathValue(pkg2, `cloud[${key}].code`);
				let canAdd = !p1c && !!p2c;
				let canRemove = !!p1c && !p2c;
				let hasChange = (p1c != p2c);
				let change = canAdd ? 'add' : canRemove ? 'remove' : hasChange ? 'change' : 'none';
				components.push({
					title:	`Cloud: ${key}`,
					type: 	'cloud',
					path:	`cloud[${key}].code`,
					id: 	key,
					p1: 	pkg1.cloud[key],
					p2: 	pkg2.cloud[key],
					v1: 	pathValue(pkg1, `cloud[${key}].code`),
					v2: 	pathValue(pkg2, `cloud[${key}].code`),
					change: change
				})
			})
			$scope.diff.stats = {
				changes: 	components.filter(c=>c.change == 'change').length,
				adds: 		components.filter(c=>c.change == 'add').length,
				removes: 	components.filter(c=>c.change == 'remove').length
			}
			$scope.diff.components = components;
			tools.dialog('/core/project-package.dialog');
		},
		compare: (item)=>{
			$scope.diff.item = item;
			return new Promise((res,rej)=>{
				console.log(item);
				let mode = 'ace/mode/html'
				if(item.path.indexOf('.js') != -1 || item.path.indexOf('_js') != -1 || item.path.indexOf('cloud.') != -1)
					mode = 'ace/mode/javascript'

				$.getScript('/vendor/ace-diff.min.js', r=>{
					tools.dialog('/core/project-diff.dialog', {
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
		merge: ()=>{
			let pkg1 = $scope.diff.pkg1;
			let pkg2 = $scope.diff.pkg2;
			$scope.diff.components.forEach(item=>{
				if(item.approved){
					if(item.change == 'change')
						pathValue(pkg1, item.path, (item.cout ? item.cout(item.rev || item.v2) : (item.rev || item.v2)))
					else if(item.change == 'add')
						pkg1[item.type][item.id] = item.p2;
					else if(item.change == 'remove')
						delete pkg1[item.type][item.id];
					else
						console.log({status: 'not sure', item});
				}
			})
			
			//if pkg1 or pkg2 is of stage "dev": update that variation.
			//otherwise, create a new variation.
			console.log(pkg1.stage, pkg2.stage);
			if(pkg1.stage == 'dev'){
				console.log('PROMOTE', pkg1);
				edit.variation.promote(pkg1, pkg1)
			}else{
				console.log('DUPLICATE');
				edit.variation.duplicate(pkg1, `Merge of: ${pathValue($scope, 'diff.pkg1.var.title')} and ${pathValue($scope, 'diff.pkg2.var.title')}`);
			}
			$mdDialog.hide();
			// $scope.diff.packageRef.set(pkg1).then(function(){
			// 	window.location.reload();
			// })
		},
		publish: function(pkg){
			pkg = Fire.prepare(pkg);
			pkg = Fire.prepare(pkg);
			//Publish package to market.
			pkg.meta = {
				view:		$scope.params.view,
				createdOn:	new Date().toISOString(),
				updatedOn:	new Date().toISOString(),
				createdBy:	(({displayName, email, uid}) => ({displayName, email, uid}))($scope.user),
				abcId:		config.abcId || null,
			}
			$http.post('https://a.alphabetize.us/cloud/package', pkg).then(r=>{
				tools.alert(r.data);
			})
		}
	},
	code: {
		compare: (v1)=>{
			let v2 = {
				title:	$scope.edit.obj.title,
				type:	$scope.edit.obj.type,
				code:	$scope.editor.getValue(),
			}
			
			if(!v1){ //If they pass an empty object init code, if they don't pass anything - comare against original code.
				v1 = {
					title:	'Non-Modified',
					type:	$scope.edit.obj.type,
					code:	$scope.edit.obj.origCode || '',
				}
			}else{
				v1.title = v1.title || 'New Code';
				v1.code = v1.code || '';
			}
			
			// let ac = {
			// 	title:	`(active) ${v1.title}`,
			// 	code:	v1.code
			// }
			// let nc = {
			// 	title:	`(side) ${v2.id}`,
			// 	code:	v2.code
			// }
			edit.code.diff($scope.editor, v1, v2).then(code=>{
				$scope.editor.setValue(code, -1);
			})
		},
		diff: (editor, v1, v2)=>{
			return new Promise((res,rej)=>{
				$scope.resolveDiff = res;
				$.getScript('https://unpkg.com/ace-diff@^2.0.0', r=>{
					tools.dialog('/core/edit-diff.dialog');
					$timeout(()=>{
						let differ = $scope.temp.diffs = new AceDiff({
							element:	'#codediff',
							theme:		editor.getTheme(),
							mode:		editor.session.getMode().$id,
							left: {
								content: v1.code,
							},
							right: {
								content: v2.code,
							},
						});
						$scope.diffs = {
							title: 'Code Compare',
							left: v1,
							right: v2,
							editor: differ
						}
					}, 1000)
				})
			})
		},
		applyDiff: (side)=>{
			let code = $scope.temp.diffs.getEditors()[side].getValue();
			$scope.resolveDiff(code);
			$mdDialog.hide();
		},
	},
	component: {
		init: function(){
			//load list of page-related components
			edit.sync();
			$scope.inEdit = 'cEditor';
			edit.ace.setup('cEditor', '', 'ace/mode/html');
			if($scope.edit.component)
				edit.component.focus($scope.edit.component, true)
		},
		focus: function(component, nosync){
			if(component){
				if(!nosync)
					edit.sync();
				var editor = 'cEditor';
				component.code = component.code || '';
				$scope.edit.component = component;
				$scope.edit.obj = {
					type:		'component',
					title:		component.id,
					origCode:	component.code
				}

				var mime = {js: 'ace/mode/javascript', css: 'ace/mode/css', text: 'ace/mode/text'}
				var suffix = component.id || '';
					suffix = suffix.split('.');
					suffix = suffix[suffix.length-1];
				var mode = mime[suffix] || 'ace/mode/html';

				edit.ace.setup(editor, component.code, mode, component.state);
			}
		},
		add: function(id=prompt('Name Component')){
			$scope.edit.project.component = $scope.edit.project.component || {};
			$scope.edit.project.component[id] = {createdOn: new Date(), createdBy: $scope.user.uid, id, code: ''};
			$scope.edit.$components.push($scope.edit.project.component[id]);
		},
		delete: function(component){
			let proj = $scope.edit.project;
			let idx = $scope.edit.$components.indexOf(component);
			api.act('_component.delete', (proj, component)=>{
				delete proj.component[component.id];
				$scope.edit.$components.splice(idx, 1);
				tools.alert('Component Deleted.');
			}, (proj, component)=>{
				proj.component[component.id] = component;
				$scope.edit.$components.splice(idx, 0, component);
				tools.alert('Component Restored.');
			}, proj, component)
		},
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
		init: function(){
			//load list of page-related clouds
			edit.sync();
			$scope.inEdit = 'ccEditor';
			edit.ace.setup('ccEditor', '', 'ace/mode/javascript');
			if($scope.edit.cloud)
				edit.cloud.focus($scope.edit.cloud, true)
		},
		add: function(id=prompt('Name Cloud Code')){
			$scope.edit.project.cloud = $scope.edit.project.cloud || {};
			$scope.edit.project.cloud[id] = {createdOn: new Date(), createdBy: $scope.user.uid, id, code: 'js={\n\tinit: function(request, response){\n\t\t\n\t}\n}'};
			$scope.edit.$clouds.push($scope.edit.project.cloud[id]);
		},
		focus: function(cloud, nosync){
			if(cloud){
				if(!nosync)
					edit.sync();
				var editor = 'ccEditor';
				var mode = 'ace/mode/javascript';
				cloud.code = cloud.code || '';
				$scope.edit.cloud = cloud;
				$scope.edit.obj = {
					type:		'cloud',
					title:		cloud.id,
					origCode:	cloud.code
				}
				edit.ace.setup(editor, cloud.code, mode, cloud.state);
			}
		},
		delete: function(cloud){
			let proj = $scope.edit.project;
			let idx = $scope.edit.$clouds.indexOf(cloud);
			api.act('_component.delete', (proj, cloud)=>{
				delete proj.cloud[cloud.id];
				$scope.edit.$clouds.splice(idx, 1);
				tools.alert('Cloud Code Deleted.');
			}, (proj, cloud)=>{
				proj.cloud[cloud.id] = cloud;
				$scope.edit.$clouds.splice(idx, 0, cloud);
				tools.alert('Cloud Code Restored.');
			}, proj, cloud)
		},
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
	
	ace: {
		focus: function(editor){
			let code, mode, state;
			if($scope[editor])
				code = $scope[editor].getValue();
			
			if(editor == 'htmlEditor'){
				mode = 'ace/mode/html';
				code = code || pathValue($scope, 'edit.project.page.html');
				state = pathValue($scope, 'edit.project.page.htmlState');
			}else if(editor == 'jsEditor'){
				mode = 'ace/mode/javascript';
				code = code || pathValue($scope, 'edit.project.page.js');
				state = pathValue($scope, 'edit.project.page.jsState');
			}
			edit.ace.setup(editor, code, mode, state);
		},
		state: (editor, state)=>{
			var session = editor.session;
			if(state){
				session.selection.fromJSON(state.selection)
				try {
					if(state.folds && state.folds.length > 100){
						console.log(editor, state);
						state.folds = [];
					}
					state.folds.forEach(function(fold){
						let range = ace.Range.fromPoints(fold.start, fold.end);
						session.addFold(fold.placeholder, range);
					});
				} catch(e) {}
				session.setScrollTop(state.scrollTop)
				session.setScrollLeft(state.scrollLeft)
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
			edit.ace.state($scope[editor], state);
		
			if(!$scope[editor].__projCommandsAdded){
				$scope[editor].__projCommandsAdded = true;
		
				$scope[editor].commands.addCommand({
					name: 'save',
					bindKey: {win: 'Ctrl-s', mac: 'Command-s'},
					exec: function(editor) {
						edit.variation.save(true);
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
						edit.snippet.init();
					}
				});
				
				$scope[editor].insights = edit.ace.lineInsights($scope[editor], $scope, $compile);
			}
		},
		
		/**
		 * @param {Object} editor - The Ace Editor instance
		 * @param {Object} $scope - The parent AngularJS scope
		 * @param {Function} $compile - The AngularJS $compile service
		 */
		lineInsights: (editor, $scope, $compile)=>{
		    const Anchor = ace.require('ace/anchor').Anchor;

		    // 1. Ensure Widget Manager
		    if (!editor.session.widgetManager) {
		        const LineWidgets = ace.require('ace/line_widgets').LineWidgets;
		        editor.session.widgetManager = new LineWidgets(editor.session);
		        editor.session.widgetManager.attach(editor);
		    }
		
		    const state = {
		        entries: new Map() // Anchor -> { item, widget, scope }
		    };
		
		    // --- REFRESH GUTTER SYMBOLS ---
		    function refreshAnnotations() {
		        const annotations = [];
		        state.entries.forEach((data, anchor) => {
		            annotations.push({
		                row: anchor.row,
		                column: 0,
		                text: data.item.text || '',
		                type: data.item.type || 'info' // 'error', 'warning', or 'info'
		            });
		        });
		        editor.session.setAnnotations(annotations);
		    }
		
		    // --- WIDGET LOGIC ---
		    function removeWidget(data) {
		        if (data.widget) {
		            editor.session.widgetManager.removeLineWidget(data.widget);
		            data.widget = null;
		        }
		        if (data.scope) {
		            data.scope.$destroy();
		            data.scope = null;
		        }
		    }
		
		    function toggleWidget(anchor, data) {
		        if (data.widget) {
		            removeWidget(data);
		            return;
		        }
		
		        // Create a dedicated scope for the widget
		        const widgetScope = $scope.$new();
		        widgetScope.item = data.item;
		        widgetScope.row = anchor.row;
		        widgetScope.close = () => removeWidget(data);
		
		        // Define the template
		        // Note: we wrap the whole thing in a div to ensure $compile returns 1 root element
		        const template = `
		            <div class="ace-ai-widget ${data.item.type || 'info'}">
		                <div class="ace-ai-widget-head">
		                    <span class="ace-ai-widget-badge">{{item.label || 'Insight'}}</span>
		                    <button type="button" class="ace-ai-widget-close" ng-click="close()">×</button>
		                </div>
		                <div class="ace-ai-widget-body">
		                    ${data.item.html || '<div>{{item.text}}</div>'}
		                </div>
		            </div>
		        `;
		
		        // Compile and link
		        const compiledElement = $compile(template)(widgetScope);
		        
		        // Use the actual DOM element from the compiled jqLite object
		        const widgetEl = compiledElement[0];
		
		        const widget = {
		            row: anchor.row,
		            fixedWidth: true,
		            el: widgetEl
		        };
		
		        editor.session.widgetManager.addLineWidget(widget);
		        data.widget = widget;
		        data.scope = widgetScope;
		
		        // Sync widget movement with anchor
		        anchor.on("change", () => {
		            widget.row = anchor.row;
		            editor.session.widgetManager.updateLineWidgets();
		        });
		
		        widgetScope.$evalAsync();
		    }
		
		    // --- EVENT: CLICK GUTTER SYMBOL ---
		    const onGutterClick = (e) => {
		        const row = e.getDocumentPosition().row;
		        // Find entry for this row
		        let found = null;
		        for (let [anchor, data] of state.entries) {
		            if (anchor.row === row) { found = { anchor, data }; break; }
		        }
		
		        if (found) {
		            toggleWidget(found.anchor, found.data);
		            e.stop();
		        }
		    };
		
		    editor.on('gutterclick', onGutterClick);
		
		    // --- STYLES ---
		    (function injectStyles() {
		        if (document.getElementById('ace-insight-minimal-styles')) return;
		        const style = document.createElement('style');
		        style.id = 'ace-insight-minimal-styles';
		        style.textContent = `
		            .ace-ai-widget { 
		                margin: 5px 20px; 
		                background: #fff; 
		                border: 1px solid #d1d5db; 
		                border-left: 5px solid #3b82f6; 
		                border-radius: 4px; 
		                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
		                font-family: sans-serif;
		            }
		            .ace-ai-widget.warning { border-left-color: #f59e0b; }
		            .ace-ai-widget.error { border-left-color: #ef4444; }
		            
		            .ace-ai-widget-head { 
		                padding: 6px 10px; 
		                background: #f9fafb; 
		                display: flex; 
		                justify-content: space-between; 
		                border-bottom: 1px solid #edf2f7; 
		            }
		            .ace-ai-widget-badge { font-size: 11px; font-weight: bold; color: #6b7280; text-transform: uppercase; }
		            .ace-ai-widget-close { cursor: pointer; border: none; background: none; font-size: 18px; line-height: 1; color: #9ca3af; }
		            .ace-ai-widget-close:hover { color: #111; }
		            .ace-ai-widget-body { padding: 10px; font-size: 13px; color: #374151; }
		        `;
		        document.head.appendChild(style);
		    })();
		
		    // --- PUBLIC API ---
		    return {
		        set(items) {
		            this.clear();
		            (items || []).forEach(item => this.add(item));
		        },
		        add(item) {
		        	item.row = item.row-1;
		            const anchor = new Anchor(editor.session, item.row, 0);
		            const data = { item: item, widget: null, scope: null };
		            state.entries.set(anchor, data);
		            anchor.on("change", () => refreshAnnotations());
		            refreshAnnotations();
		        },
		        clear() {
		            state.entries.forEach((data, anchor) => {
		                removeWidget(data);
		                anchor.detach();
		            });
		            state.entries.clear();
		            editor.session.clearAnnotations();
		        },
		        destroy() {
		            this.clear();
		            editor.off('gutterclick', onGutterClick);
		        }
		    }
		}
		// customize: ()=>{
		// 	ace.define('ace/mode/javascript_highlight_rules', [
		// 		'require',
		// 		'exports',
		// 		'module',
		// 		'ace/lib/oop',
		// 		'ace/mode/javascript_highlight_rules',
		// 		'ace/mode/html_highlight_rules'
		// 	], function(require, exports, module){
		// 		'use strict';
			
		// 		var oop = require('ace/lib/oop');
		// 		var JavaScriptHighlightRules = require('ace/mode/javascript_highlight_rules').JavaScriptHighlightRules;
		// 		var HtmlHighlightRules = require('ace/mode/html_highlight_rules').HtmlHighlightRules;
			
		// 		var JsHtmlHighlightRules = function(){
		// 			JavaScriptHighlightRules.call(this);
			
		// 			this.embedRules(HtmlHighlightRules, 'html-', [
		// 				{
		// 					token: 'string.end',
		// 					regex: '`',
		// 					next: 'start'
		// 				}
		// 			]);
			
		// 			this.$rules.start.unshift({
		// 				token: ['support.function', 'string.start'],
		// 				regex: /(html)(`)/,
		// 				next: 'html-start'
		// 			});
			
		// 			this.normalizeRules();
		// 		};
			
		// 		oop.inherits(JsHtmlHighlightRules, JavaScriptHighlightRules);
			
		// 		exports.JsHtmlHighlightRules = JsHtmlHighlightRules;
		// 	});
			
		// 	ace.define('ace/mode/behaviour/jshtml', [
		// 		'require',
		// 		'exports',
		// 		'module',
		// 		'ace/lib/oop',
		// 		'ace/mode/behaviour',
		// 		'ace/token_iterator'
		// 	], function(require, exports, module){
		// 		'use strict';
			
		// 		var oop = require('ace/lib/oop');
		// 		var Behaviour = require('ace/mode/behaviour').Behaviour;
		// 		var TokenIterator = require('ace/token_iterator').TokenIterator;
			
		// 		var VOID_TAGS = {
		// 			area: 1,
		// 			base: 1,
		// 			br: 1,
		// 			col: 1,
		// 			embed: 1,
		// 			hr: 1,
		// 			img: 1,
		// 			input: 1,
		// 			link: 1,
		// 			meta: 1,
		// 			param: 1,
		// 			source: 1,
		// 			track: 1,
		// 			wbr: 1
		// 		};
			
		// 		var JsHtmlBehaviour = function(){
		// 			this.add('autoclose-html-tag', 'insertion', function(state, action, editor, session, text){
		// 				if(text !== '>')
		// 					return;
			
		// 				var cursor = editor.getCursorPosition();
		// 				var line = session.getLine(cursor.row);
		// 				var left = line.slice(0, cursor.column);
		// 				var right = line.slice(cursor.column);
			
		// 				if(!isInsideHtmlTemplate(session, cursor))
		// 					return;
			
		// 				if(/\/\s*$/.test(left) || /^\s*<\/?/.test(right))
		// 					return;
			
		// 				var match = left.match(/<([a-zA-Z][a-zA-Z0-9:-]*)[^<>]*$/);
		// 				if(!match)
		// 					return;
			
		// 				var tag = match[1].toLowerCase();
		// 				if(VOID_TAGS[tag])
		// 					return {
		// 						text: '>',
		// 						selection: [1, 1]
		// 					};
			
		// 				return {
		// 					text: '></' + tag + '>',
		// 					selection: [1, 1]
		// 				};
		// 			});
		// 		};
			
		// 		oop.inherits(JsHtmlBehaviour, Behaviour);
			
		// 		function isInsideHtmlTemplate(session, pos){
		// 			var iterator = new TokenIterator(session, pos.row, pos.column);
		// 			var token = iterator.getCurrentToken();
		// 			if(token && /^html-template-/.test(token.type || ''))
		// 				return true;
			
		// 			token = iterator.stepBackward();
		// 			while(token){
		// 				if(/^html-template-/.test(token.type || ''))
		// 					return true;
			
		// 				if(token.type === 'string.end')
		// 					return false;
			
		// 				token = iterator.stepBackward();
		// 			}
			
		// 			return false;
		// 		}
			
		// 		exports.JsHtmlBehaviour = JsHtmlBehaviour;
		// 	});
			
		// 	ace.define('ace/mode/javascript', [
		// 		'require',
		// 		'exports',
		// 		'module',
		// 		'ace/lib/oop',
		// 		'ace/mode/javascript',
		// 		'ace/mode/javascript_highlight_rules',
		// 		'ace/mode/behaviour/jshtml'
		// 	], function(require, exports, module){
		// 		'use strict';
			
		// 		var oop = require('ace/lib/oop');
		// 		var JavaScriptMode = require('ace/mode/javascript').Mode;
		// 		var JsHtmlHighlightRules = require('ace/mode/javascript_highlight_rules').JsHtmlHighlightRules;
		// 		var JsHtmlBehaviour = require('ace/mode/behaviour/jshtml').JsHtmlBehaviour;
			
		// 		var Mode = function(){
		// 			JavaScriptMode.call(this);
		// 			this.HighlightRules = JsHtmlHighlightRules;
		// 			this.$behaviour = new JsHtmlBehaviour();
		// 			this.$id = 'ace/mode/javascript';
		// 		};
			
		// 		oop.inherits(Mode, JavaScriptMode);
			
		// 		(function(){
		// 			this.lineCommentStart = '//';
		// 			this.blockComment = {start: '/*', end: '*/'};
		// 		}).call(Mode.prototype);
			
		// 		exports.Mode = Mode;
		// 	});
		// }
	}
}