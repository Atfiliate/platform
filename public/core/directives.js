 /*global app*/

app.directive("contenteditable", function() {
	return {
		restrict: "A",
		require: "ngModel",
		link: function(scope, element, attrs, ngModel) {
			it.element = element;
			var read;
			if(!ngModel)
				return;
			
			ngModel.$render = function() {
				var val = ngModel.$viewValue || attrs.placeholder || '';
				if(attrs.type == 'html')
					return element.html(val);
				else
					return element.text(val);
			};
			element.bind('focus', function(){
				if(attrs.placeholder == $.trim(element[0].innerText) && !ngModel.$viewValue)
					element.html('');
			});
			element.bind('keyup', function(ev){
				if (ngModel.$viewValue !== $.trim(element[0].innerText)){
					return scope.$apply(function(){
						read(ev.code)
					});
				}
			});
			element.bind('blur', function(){
				var newVal = $.trim(element[0].innerText)
				if(!newVal.length && attrs.placeholder){
					element.text(attrs.placeholder);
				}
			});
			return read = function(evCode){
				if(attrs.type == 'html')
					var newVal = element.html();
				else if(attrs.type == 'number')
					var newVal = parseFloat($.trim(element[0].innerText))
				else if(evCode == 'Space'){
					var newVal = $.trim(element[0].innerText)+' ';
				}else{
					var newVal = $.trim(element[0].innerText)
				}
				
				ngModel.$setViewValue(newVal);
				if (attrs.ngChange)
					scope.$eval(attrs.ngChange);
			};
		}
	};
});


app.directive('sticky', ['$timeout', function($timeout) {
	return {
		restrict: 'A',
		link: function(scope, element, attrs) {
			$timeout(() => {
				// Create a sentinel element right before the sticky one
				const sentinel = document.createElement('div');
				sentinel.style.position = 'absolute';
				sentinel.style.top = '0px';
				sentinel.style.height = '1px';
				element[0].parentNode.insertBefore(sentinel, element[0]);

				const observer = new IntersectionObserver(([entry]) => {
					if (!entry.isIntersecting) {
						element.addClass('stuck');
					} else {
						element.removeClass('stuck');
					}
				}, {
					threshold: [0],
					rootMargin: '0px 0px 0px 0px'
				});

				observer.observe(sentinel);

				// Clean up on destroy
				scope.$on('$destroy', () => observer.disconnect());
			});
		}
	};
}]);

//Cloudinary Transformations to Images
app.directive('clSrc', function($timeout) {
	return {
		restrict: 'A',
		scope: { clSrc: '@'},
		link: function(scope, ele, attrs) {
			scope.attrs = attrs;
			var tsrc, src;
			function transform(attrs){
				it.a=attrs;
				var tlKeys = Object.keys(attrs)
				tlKeys = tlKeys.filter(function(key){
					return key.indexOf('transform') == 0
				})
				var transform = ''
				tlKeys.forEach(function(key, i){
					var val = attrs[key];
					transform += key.replace('transform','').toLowerCase() + '_' + val
					if(i != tlKeys.length - 1)
						transform += ','
				})
				if(tlKeys.length && !attrs['transformC'])
					transform += ',c_fill'
				if(attrs['auto']){
					if(tlKeys.length)
						transform += ','
					transform += 'g_auto,q_auto,f_auto'
				}
				
				var clKeys = Object.keys(attrs)
				clKeys = clKeys.filter(function(key){
					return key.indexOf('constrain') == 0
				})
				var constrain = ''
				clKeys.forEach(function(key, i){
					var val = attrs[key];
					constrain += key.replace('constrain','').toLowerCase() + '_' + val
					if(i != clKeys.length - 1)
						constrain += ','
				})
				if(clKeys.length && !attrs['constrainC'])
					constrain += ',c_fill'
				if(constrain.length)
					transform += '/'+constrain
					
				return transform;
			}
			scope.$watch('clSrc', function(val) {
				tsrc = val.split('upload');
				src = val;
				if(tsrc.length > 1){
					let nxtstr = tsrc[1] || '';
					if(nxtstr.includes('w_') || nxtstr.includes('h_')){
						asrc = nxtstr.split('/');
						let tfrm = asrc.shift();
							tfrm = asrc.shift();
						src = `${tsrc[0]}upload/${tfrm}/${transform(attrs)}/${asrc.join('/')}`;
					}else{
						src = tsrc[0]+'upload/'+transform(attrs)+tsrc[1];
					}
				}
				$(ele).attr("src", src);
			})
			scope.$watch('attrs', function(newVal, oldVal){
				if(newVal.clSrc){
					tsrc = newVal.clSrc.split('upload');
					src = newVal.clSrc;
					if(tsrc.length > 1){
						let nxtstr = tsrc[1] || '';
						if(nxtstr.includes('w_') || nxtstr.includes('h_')){
							asrc = nxtstr.split('/');
							let tfrm = asrc.shift();
								tfrm = asrc.shift();
							src = `${tsrc[0]}upload/${tfrm}/${transform(newVal)}/${asrc.join('/')}`;
						}else{
							src = tsrc[0]+'upload/'+transform(newVal)+tsrc[1];
						}
					}
					$(ele).attr("src", src);
				}
			}, true);
		}
	};
});

//This allows us to dynamically import a url OR compile a template (use dyno="{{var}}"")
app.directive('dyno', function($compile, $sce) {
    return {
        restrict: 'A', // Element directive
        link: function(scope, element, attrs) {
            scope.$watch(function() {return element.attr('dyno')}, function(newValue) {
            	if (!newValue) return;
                if (newValue.includes('<')){
					element.html($compile(newValue)(scope));
                } else {
                    scope.$url = $sce.trustAsResourceUrl(newValue);
                    element.html($compile('<div ng-include="$url"></div>')(scope));
                }
            });
        }
    };
});
// app.directive('include', function($compile, $sce) {
//     return {
//         restrict: 'A', // Element directive
//         link: function(scope, element, attrs) {
//             scope.$watch(function() {return element.attr('include')}, function(newValue) {
//             	if (!newValue) return;
//                 if (newValue.includes('<')){
// 					element.html($compile(newValue)(scope));
//                 } else {
//                     scope.$url = $sce.trustAsResourceUrl(newValue);
//                     element.html($compile('<div ng-include="$url"></div>')(scope));
//                 }
//             });
//         }
//     };
// });
app.directive('include', function($compile, $sce, $parse) {
	return {
		restrict: 'A',
		scope: false,
		link: function(scope, element, attrs) {
			let childScope;
			const getter = $parse(attrs.include);

			function cleanup() {
				if (childScope) {
					childScope.$destroy();
					childScope = null;
				}
				element.empty();
			}

			scope.$watch(getter, function(newValue) {
				if (!newValue) return cleanup();

				let unwrapped;
				try {
					unwrapped = $sce.valueOf(newValue);
				} catch (e) {
					return cleanup();
				}

				if (!unwrapped || typeof unwrapped !== 'string') return cleanup();

				scope.$evalAsync(() => {
					cleanup();
					childScope = scope.$new();

					if (/<[a-z!/]/i.test(unwrapped)) {
						const compiled = $compile(unwrapped)(childScope);
						element.append(compiled);
					} else {
						let trustedUrl;
						try {
							trustedUrl = $sce.getTrustedResourceUrl(newValue);
						} catch (e) {
							trustedUrl = $sce.trustAsResourceUrl(unwrapped);
						}
						childScope.$url = trustedUrl;
						const compiled = $compile('<div ng-include="$url"></div>')(childScope);
						element.append(compiled);
					}
				});
			});
		}
	};
});



//compiles html
app.directive('compile', function($compile) {
	return {
		restrict: 'A',
		link: function(scope, element, attr) {
			scope.$watch(function() {return element.attr('compile'); }, function(newValue){
				if(newValue)
					element.html($compile(newValue)(scope));
			});
		}
	}
})

app.config(function($sanitizeProvider) {
	$sanitizeProvider.addValidElements({htmlElements: ['span','p']});
	$sanitizeProvider.addValidAttrs(['style']);
});

// let markPromise;
// app.directive('markdown', function($sanitize) {
//   return {
//     restrict: 'A',
// 	link: function(scope, element, attr) {
// 		scope.$watch(function() {return element.attr('markdown'); }, function(newValue){
// 			markPromise = markPromise || $.getScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
// 			markPromise.then(()=>{
// 		        const html = marked.parse(newValue);
// 		        element.html($sanitize(html));
// 			});
// 		});
// 	}
//   };
// });

//drag and drop.
app.directive('drag', function(){
	return {
		restrict: 'A',
		scope: {
			dragstart:	'&',
			dragend:	'&'
		},
		link: function(scope, elem, attrs){
			elem.prop('draggable', true);
			if(scope.dragstart)
				elem.on('dragstart', function(){
					scope.dragstart(scope, elem);
				})
			if(scope.dragend)
				elem.on('dragend', function(){
					scope.dragend(scope, elem);
				})
		}
	}
})
// app.directive('drop', function(){
// 	return {
// 		restrict: 'A',
// 		scope: {
// 			dragover:	'&',
// 			drop:		'&'
// 		},
// 		link: function(scope, elem, attrs){
// 			console.log({scope,elem,attrs})
// 			elem.on('dragover', function(event){
// 				event.preventDefault();
// 				if(scope.dragover && scope.dragover())
// 					scope.dragover()(scope, elem, event);
// 			})
// 			elem.on('drop', function(event){
// 				event.preventDefault();
// 				if(scope.drop && scope.drop())
// 					scope.drop()(scope, elem, event);
// 			})
// 		}
// 	}
// })

app.directive('drop', function () {
  return {
    restrict: 'A',
    scope: {
      dragover: '&?',   // optional
      drop: '&?'        // optional
    },
    link: function (scope, elem, attrs) {
      function invoke(expr, e) {
        if (!expr) return;
        scope.$applyAsync(function () {
			var native = e && (e.originalEvent || e);
	        expr({ $event: native, element: elem, attrs: attrs });
        });
      }
      elem.on('dragover', function (e) {
        e.preventDefault();
        invoke(scope.dragover, e);
      });
      elem.on('drop', function (e) {
        e.preventDefault();
        invoke(scope.drop, e);
      });
      scope.$on('$destroy', function () {
        elem.off('dragover');
        elem.off('drop');
      });
    }
  };
});

app.directive('fileDrop', function() {
	return {
		restrict: 'A',
		scope: {
			onFileDrop: '&'
		},
		link: function(scope, element) {
			element.on('dragstart', e=>{
				e.preventDefault();
				return false;
			});
			element.on('dragover', e=>{
				e.preventDefault();
				e.stopPropagation();
				element.addClass('hover');
			});
			element.on('dragleave', e=>{
				e.preventDefault();
				e.stopPropagation();
				element.removeClass('hover');
			});
			element.on('drop', e=>{
				e.preventDefault();
				e.stopPropagation();
				element.removeClass('hover');

				const files = e.originalEvent.dataTransfer.files;
				if(!files.length)
					return;
				scope.onFileDrop({files});
			});
		}
	};
});

-//HTML: <img zoom-src="{{doc.image.secure_url}}" zoom="myVar" crop="true">
-//myVar will be assigned to the $scope ($scope.myVar)
-//myVar will receive a few tools for interacting with the directive:		
-//myVar.get(), myVar.set(obj), myVar.reset(), myVar.undo()
app.directive('zoom', function($interval, $timeout, $q){
	return {
		restrict: 'A',
		replace: true,
		template: '<div class="zoom"><div class="zoom-container"><img class="zoom-image"></div><div class="zoom-crop" style="text-align:center; padding:15px;">^ Crop ^</div></div>',
		scope: { 
			zoom: '='
			
		},
		link: function(scope, element, attrs){
			var project = {}
				project.defer = $q.defer()
				project.promise = function(){return project.defer.promise}

			var p = project.p = {id:[]};
			
			project.container = angular.element(element.children()[0]);
			project.img = angular.element(project.container.children()[0]);
			project.oimg = new Image();

			if(attrs.crop)
				project.crop = angular.element(element.children()[1]);
			else
				angular.element(element.children()[1]).css({display:'none'})
			
			project.history = [];	//Each snapshot will be recorded so one can undo
			project.current = {};	//This is the live state (while events are occurring)
			project.snapshot = {};	//This is set once events are finished (on touchend & mouseup)
			project.touch = {};		
			project.mouse = {};		

			var tools = project.tools = {
				init: function(src){
					project.defer = $q.defer()
					project.promise = function(){return project.defer.promise}
					project.src = src;
					project.img[0].src = src;
					project.oimg.src = src;
					project.renderCt = 0;
					
					project.img.css({
						position:	'absolute',
					})
					project.oimg.onload = function(){
						project.img.ratio = project.oimg.height / project.oimg.width
						project.original = {
							w:		project.oimg.width,
							h:		project.oimg.height,
							ratio:	project.oimg.height / project.oimg.width,
						}
						tools.redraw()
						project.original.mult = project.oimg.width / project.container.w,
						tools.zoom(0,0,project.container.w,project.container.h, true)
						tools.crop(project.container.h, true)
						window.requestAnimationFrame(tools.render)
						window.onresize = project.tools.redraw;
						project.defer.resolve();
					}
					
					// Setup Listeners
					project.container.on("touchstart", tools.touch.start);
					project.container.on("touchmove", tools.touch.move);
					project.container.on("touchend", tools.touch.end);
					project.container.on("mousewheel", tools.cursor.scroll);
					project.container.on("DOMMouseScroll", tools.cursor.scroll);
					project.container.on("mousedown", tools.cursor.start);
					project.container.on("mousemove", tools.cursor.move);
					project.container.on("mouseup", tools.cursor.end);
					
					if(project.crop){
						project.crop.on("touchstart", tools.handlebar.start);
						project.crop.on("touchmove", tools.handlebar.move);
						project.crop.on("touchend", tools.handlebar.end);
						project.crop.on("mousedown", tools.handlebar.start);
						project.crop.on("mousemove", tools.handlebar.move);
						project.crop.on("mouseup", tools.handlebar.end);
					}
					return project.promise;
				},
				redraw: function(){
					project.offset = project.container.offset();
					if(project.container.w != project.container.parent().width()){
						project.container.w = project.container.parent().width();
						project.container.h = project.container.w * project.img.ratio;
		
						project.container.css({
							position:	'relative',
							overflow:	'hidden',
							width:		project.container.w,
							height: 	project.container.h
						})
					}
				},
				reset: function(){
					var w = project.container.w;
					var h = w*project.original.ratio;
					tools.zoom(0,0,w,h, true)
					tools.crop(h, true)
				},
				undo: function(){
					var past = project.history.pop()
					if(past && past.crop){
						project.current = {...past}
						project.snapshot = {...past}
					}
				},
				zoom: function(x,y,w,h,snapshot){
					var crop = false;
					project.current.x = x
					project.current.y = y
					project.current.w = w
					project.current.h = h
	
					if(snapshot){
						project.history.push(Object.assign({}, project.snapshot))
						project.snapshot = Object.assign({}, project.current);
					}
				},
				pan: function(x,y,snapshot){
					project.current.x = x
					project.current.y = y
					if(snapshot){
						project.history.push(Object.assign({}, project.snapshot))
						project.snapshot = Object.assign({}, project.current);
					}
				},
				crop: function(crop, snapshot){
					project.current.crop = crop;
					project.container.height(crop);
					if(snapshot){
						project.history.push(Object.assign({}, project.snapshot))
						project.snapshot = Object.assign({}, project.current);
					}
				},
				render: function(){
					project.renderCt++;
					var css = 'margin-left: '	+project.current.x+'px !important; ';
						css += 'margin-top: '	+project.current.y+'px !important; ';
						css += 'width: '		+project.current.w+'px !important; ';
						css += 'height: '		+project.current.h+'px !important; ';
					project.img.attr('style', css)
					
					project.container.height(project.current.crop)
					window.requestAnimationFrame(tools.render)
				},
				cursor: {
					scroll: function(e){
						e.preventDefault();
						
						p.sx = e.originalEvent.pageX-project.offset.left
						p.sy = e.originalEvent.pageY-project.offset.top
						p.w = project.current.w - (project.current.w*e.originalEvent.deltaY / 1100);
						p.h = p.w * project.img.ratio
						
						p.scale = project.current.w/project.container.w;
						p.zoom = p.w/project.container.w
						p.x = p.sx - (-(project.snapshot.x - (p.sx)) / project.snapshot.w * p.w);
						p.y = p.sy - (-(project.snapshot.y - (p.sy)) / project.snapshot.h * p.h);
						
						tools.zoom(p.x,p.y,p.w,p.h)
						
						//Set a timeout to capture a snapshot after scroll wheel inactivity.
						if(project.cursorSnapshot)
							$timeout.cancel(project.cursorSnapshot)
						project.cursorSnapshot = $timeout(function(){
							tools.zoom(p.x,p.y,p.w,p.h, true)
						}, 500)
					},
					start: function(e){
						e.preventDefault();
						project.mouse['Start'] = e.originalEvent;
					},
					end: function(e){
						tools.cursor.update(true);
						delete project.mouse['Start'];
						delete project.mouse['Move'];
					},
					move: function(e){
						e.preventDefault();
						project.mouse['Move'] = e.originalEvent;
						tools.cursor.update();
					},
					update: function(snapshot){
						p.s = project.mouse['Start']
						p.m = project.mouse['Move']
						if(p.s && p.m){
							p.x = project.snapshot.x - (p.s.pageX-p.m.pageX)
							p.y = project.snapshot.y - (p.s.pageY-p.m.pageY)
							tools.pan(p.x,p.y,snapshot)
						}
					}
				},
				touch: {
					start: function(event){
						event.preventDefault();
						var oect = event.originalEvent.changedTouches
						for(var i=0; i<oect.length; i++){
							project.touch['Start'+oect[i].identifier] = {pageX: oect[i].pageX, pageY: oect[i].pageY}
							p.id.push(oect[i].identifier)
							if(p.id.length > 1)
								p.zoom = true;
						}
					},
					end: function(event){
						event.preventDefault();
						tools.touch.update(true);
						var oect = event.originalEvent.changedTouches
						for(var i=0; i<oect.length; i++){
							delete project.touch['Start'+oect[i].identifier];
							delete project.touch['Move'+oect[i].identifier];
							p.id.splice(p.id.indexOf(oect[i].identifier), 1);
						}
						if(p.zoom && p.id.length==0)
							p.zoom = false;
					},
					move: function(event){
						event.preventDefault();
						
						var oect = event.originalEvent.changedTouches
						for(var i=0; i<oect.length; i++){
							project.touch['Prev'+oect[i].identifier] = project.touch['Move'+oect[i].identifier]
							project.touch['Move'+oect[i].identifier] = {pageX: oect[i].pageX, pageY: oect[i].pageY}
						}
						tools.touch.update();
					},
					update: function(snapshot){
						p.s0 = project.touch['Start'+p.id[0]]
						p.s1 = project.touch['Start'+p.id[1]]
						p.m0 = project.touch['Move'+p.id[0]]
						p.m1 = project.touch['Move'+p.id[1]]
						if(p.m0 && p.m1){
							p.sw = Math.abs(p.s0.pageX - p.s1.pageX)
							p.sh = Math.abs(p.s0.pageY - p.s1.pageY)
							p.mw = Math.abs(p.m0.pageX - p.m1.pageX)
							p.mh = Math.abs(p.m0.pageY - p.m1.pageY)
	
							p.wdiff = p.mw - p.sw;
							p.hdiff = p.mh - p.sh;
							
							p.sd = Math.sqrt(p.sw*p.sw+p.sh*p.sh)
							p.md = Math.sqrt(p.mw*p.mw+p.mh*p.mh)
	
	
							p.sxMin = Math.min(p.s0.pageX, p.s1.pageX)-project.offset.left
							p.syMin = Math.min(p.s0.pageY, p.s1.pageY)-project.offset.top
							p.mxMin = Math.min(p.m0.pageX, p.m1.pageX)-project.offset.left
							p.myMin = Math.min(p.m0.pageY, p.m1.pageY)-project.offset.top
	
							p.sxMax = Math.max(p.s0.pageX, p.s1.pageX)-project.offset.left
							p.syMax = Math.max(p.s0.pageY, p.s1.pageY)-project.offset.top
							p.mxMax = Math.max(p.m0.pageX, p.m1.pageX)-project.offset.left
							p.myMax = Math.max(p.m0.pageY, p.m1.pageY)-project.offset.top
	
							p.spx = p.sxMin + ((p.sxMax-p.sxMin)/2)
							p.spy = p.syMin + ((p.syMax-p.syMin)/2)
							p.mpx = p.mxMin + ((p.mxMax-p.mxMin)/2)
							p.mpy = p.myMin + ((p.myMax-p.myMin)/2)
							
							
							
							p.w = project.snapshot.w * (p.md/p.sd)
							p.h = p.w * project.img.ratio
							p.x = p.mpx - (-(project.snapshot.x - (p.spx)) / project.snapshot.w * p.w);
							p.y = p.mpy - (-(project.snapshot.y - (p.spy)) / project.snapshot.h * p.h);
	
							tools.zoom(p.x,p.y,p.w,p.h,snapshot)
						}else if(p.m0 && !p.zoom){
							p.xDiff = p.s0.pageX - p.m0.pageX
							p.yDiff = p.s0.pageY - p.m0.pageY
							p.mult = project.snapshot.w / project.container.w;
							p.x = project.snapshot.x - (p.xDiff);
							p.y = project.snapshot.y - (p.yDiff);
							tools.pan(p.x,p.y,snapshot)
						}
					}
				},
				handlebar: {
					start: function(event){
						event.preventDefault();
						if(event.type == 'touchstart'){
							var touch = event.originalEvent.changedTouches[0]
							project.touch['StartCrop'] = {pageX: touch.pageX, pageY: touch.pageY}
						}else{
							project.touch['StartCrop'] = event.originalEvent;
						}
					},
					end: function(event){
						event.preventDefault();
						tools.handlebar.update(true);
						delete project.touch['StartCrop'];
						delete project.touch['MoveCrop'];
					},
					move: function(event){
						event.preventDefault();
						
						if(event.type == 'touchmove'){
							var touch = event.originalEvent.changedTouches[0]
							project.touch['MoveCrop'] = {pageX: touch.pageX, pageY: touch.pageY}
						}else{
							project.touch['MoveCrop'] = event.originalEvent;
						}
						tools.handlebar.update();
					},
					update: function(snapshot){
						p.start = project.touch['StartCrop']
						p.move = project.touch['MoveCrop']
						
						if(p.start && p.move){
							var crop = project.snapshot.crop + (p.move.pageY - p.start.pageY)
							tools.crop(crop, snapshot)
						}
					}
				},
				debug: function(x,y,w,h){
					if(project.debug){
						project.debug.fillStyle="#FFF";
						project.debug.fillRect(0,0,project.canvas.width,project.canvas.height);
						project.debug.fillStyle="#000";
						project.debug.fillRect(x/project.cratio,y/project.cratio,w/project.cratio,h/project.cratio);
					}
				}
			}
			project.nextRow = function(){
				p.x = project.snapshot.x;
				p.y = project.snapshot.y-project.snapshot.crop;
				p.w = project.snapshot.w;
				p.h = project.snapshot.h;
				tools.zoom(p.x, p.y, p.w, p.h, true)
			}
			project.nextColumn = function(){
				p.x = project.snapshot.x-project.container.w;
				p.y = project.snapshot.y;
				p.w = project.snapshot.w;
				p.h = project.snapshot.h;
				tools.zoom(p.x, p.y, p.w, p.h, true)
			}
			project.getSrc = function(){
				return project.src;
			}
			project.getJson = function(str){
				var cl = project.cloudinary();
				var obj = {
					src:	project.src,
					zoom:	project.getZoom(),
					target: project.target,
					url:	cl.url,
					cl: 	cl.params
				}
				return str ? JSON.stringify(obj) : obj;
			}
			project.setJson = function(json){
				if(typeof(json) == '')
					json = JSON.parse(json);
				project.setZoom(json.zoom, json.src, json.target)
			}
			project.getZoom = function(){
				return {
					w: Math.round((project.original.w / project.snapshot.w * project.container.w)),
					h: Math.round((project.original.h / project.snapshot.h * project.snapshot.crop)),
					x: Math.round(-(project.original.w / project.snapshot.w * project.snapshot.x)),
					y: Math.round(-(project.original.h / project.snapshot.h * project.snapshot.y)),
				}
			}
			project.setZoom = function(zoom, src, target){
				if(target)
					project.target = target;
				if(src)
					project.tools.init(src)
				project.promise().then(function(){
					project.tools.redraw()
					project.current.w = (project.original.w / zoom.w * project.container.w)
					project.current.h = project.current.w * project.img.ratio;
					var ratio = project.original.w / project.current.w;
					project.current.x = -(zoom.x / ratio)
					project.current.y = -(zoom.y / ratio)
					project.current.crop = (zoom.h / ratio)
					project.snapshot = Object.assign({}, project.current);
				})
			}
			project.cloudinary = function(){
				var zoom = project.getZoom();
				var pieces = project.src.split('/upload');
				if(project.target){
					var ratio = project.target.w / project.container.w;
					var w1 =	Math.round(project.img.width() * ratio);
					var h1 =	Math.round(project.img.height() * ratio);
					var x2 =	Math.round(zoom.x * project.img.width() / project.original.w * ratio);
					var y2 =	Math.round(zoom.y * project.img.width() / project.original.w * ratio);
					var w2 =	Math.round(project.target.w);
					var h2 =	Math.round(project.target.h);
					var cl = {w1,h1,x2,y2,w2,h2};
					var transform = '/upload/w_'+w1+',h_'+h1+',c_scale/w_'+w2+',h_'+h2+',x_'+x2+',y_'+y2+',c_crop';
				}else{
					var w =	Math.round(zoom.w);
					var h =	Math.round(zoom.h);
					var x =	Math.round(zoom.x);
					var y =	Math.round(zoom.y);
					var cl = {w1:w,h1:h,x1:x,y1:y};
					var transform = '/upload/w_'+w+',h_'+h+',x_'+x+',y_'+y+',c_crop';
				}
				return {
					url: pieces[0]+transform+pieces[1],
					params: cl
				}
			}
			$timeout(()=>{
				scope.$watch(function() {return element.attr('zoom-src'); }, function(src){
					if(src)
						tools.init(src)
				})
			}, 300)
			
			if(element.attr('zoom')){
				scope[element.attr('zoom')] = scope.zoom = {
					project:	project,
					init:		tools.init,
					set:		project.setZoom,
					get:		project.getZoom,
					url:		project.cloudinary,
					reset:		tools.reset,
					undo:		tools.undo,
					src:		project.getSrc,
					toJson:		project.getJson,
					fromJson:	project.setJson
				}
			}
		}
	}
})

app.directive('horizontal', function () {
  return {
    restrict: 'AC',
    link: function (scope, element) {
      function onWheel(e) {
        e.preventDefault();
        element[0].scrollLeft += e.deltaY;
      }
      element[0].addEventListener('wheel', onWheel, { passive: false });

      scope.$on('$destroy', function () {
        element[0].removeEventListener('wheel', onWheel);
      });
    }
  };
});

app.filter('capitalize', function() {
	return function(input, all) {
		var reg = (all) ? /([^\W_]+[^\s-]*) */g : /([^\W_]+[^\s-]*)/;
		return (!!input) ? input.replace(reg, function(txt) {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		}) : '';
	}
});








app.directive('markup', function($timeout, $document) {

	var cssInstalled = false;

	function installCss() {

		if(cssInstalled)
			return;

		cssInstalled = true;

		var style = document.createElement('style');

		style.innerHTML = `
			.markup-wrapper{
				position:relative;
				display:inline-block;
				max-width:100%;
				line-height:0;
				overflow:visible;
			}

			.markup-wrapper>img{
				display:block;
				max-width:100%;
				height:auto;
				user-select:none;
				-webkit-user-drag:none;
			}

			.markup-overlay{
				position:absolute;
				inset:0;
				cursor:crosshair;
				line-height:normal;
			}

			.markup-dot{
				position:absolute;
				width:16px;
				height:16px;
				padding:0;
				border:2px solid #fff;
				border-radius:50%;
				box-shadow:
					0 2px 8px rgba(0,0,0,.35),
					0 0 0 1px rgba(0,0,0,.12);
				transform:translate(-50%,-50%);
				cursor:pointer;
				transition:
					transform .15s ease,
					box-shadow .15s ease;
			}

			.markup-dot:hover,
			.markup-dot.active{
				z-index:20;
				transform:translate(-50%,-50%) scale(1.25);
				box-shadow:
					0 3px 12px rgba(0,0,0,.45),
					0 0 0 2px rgba(255,255,255,.85);
			}

			.markup-card{
				position:absolute;
				z-index:100;
				width:260px;
				max-width:calc(100vw - 24px);
				padding:14px;
				box-sizing:border-box;
				background:#fff;
				border:1px solid rgba(0,0,0,.12);
				border-radius:12px;
				box-shadow:
					0 12px 35px rgba(0,0,0,.22),
					0 2px 8px rgba(0,0,0,.12);
				line-height:1.4;
				cursor:default;
			}

			.markup-card:before{
				content:'';
				position:absolute;
				width:12px;
				height:12px;
				top:18px;
				left:-7px;
				background:#fff;
				border-left:1px solid rgba(0,0,0,.12);
				border-bottom:1px solid rgba(0,0,0,.12);
				transform:rotate(45deg);
			}

			.markup-card.left:before{
				left:auto;
				right:-7px;
				border-left:0;
				border-bottom:0;
				border-top:1px solid rgba(0,0,0,.12);
				border-right:1px solid rgba(0,0,0,.12);
			}

			.markup-card-header{
				display:flex;
				align-items:center;
				gap:8px;
				margin-bottom:10px;
			}

			.markup-card-title{
				flex:1;
				font-family:Arial,sans-serif;
				font-size:14px;
				font-weight:600;
				color:#222;
			}

			.markup-card-close{
				width:28px;
				height:28px;
				padding:0;
				border:0;
				border-radius:50%;
				background:transparent;
				color:#666;
				font-size:20px;
				line-height:28px;
				cursor:pointer;
			}

			.markup-card-close:hover{
				background:#f2f2f2;
				color:#111;
			}

			.markup-card textarea{
				display:block;
				width:100%;
				min-height:90px;
				padding:10px;
				box-sizing:border-box;
				resize:vertical;
				border:1px solid #ccc;
				border-radius:8px;
				outline:none;
				font:14px/1.4 Arial,sans-serif;
			}

			.markup-card textarea:focus{
				border-color:#1976d2;
				box-shadow:0 0 0 2px rgba(25,118,210,.15);
			}

			.markup-card-color-row{
				display:flex;
				align-items:center;
				gap:10px;
				margin-top:12px;
				font-family:Arial,sans-serif;
				font-size:13px;
				color:#444;
			}

			.markup-card-color-row input[type="color"]{
				width:42px;
				height:32px;
				padding:2px;
				border:1px solid #ccc;
				border-radius:7px;
				background:#fff;
				cursor:pointer;
			}

			.markup-card-actions{
				display:flex;
				align-items:center;
				gap:8px;
				margin-top:14px;
			}

			.markup-card-button{
				min-height:34px;
				padding:0 14px;
				border:0;
				border-radius:8px;
				font:600 13px Arial,sans-serif;
				cursor:pointer;
			}

			.markup-card-save{
				background:#1976d2;
				color:#fff;
			}

			.markup-card-save:hover{
				background:#1565c0;
			}

			.markup-card-delete{
				background:#f5f5f5;
				color:#c62828;
			}

			.markup-card-delete:hover{
				background:#ffebee;
			}

			.markup-card-spacer{
				flex:1;
			}

			@media(max-width:600px){
				.markup-card{
					position:fixed;
					left:12px !important;
					right:12px;
					bottom:12px;
					top:auto !important;
					width:auto;
					max-width:none;
				}

				.markup-card:before{
					display:none;
				}
			}
		`;

		document.head.appendChild(style);

	}

	return {
		restrict:'A',
		require:'ngModel',

		link:function(scope, element, attrs, ngModel){

			installCss();

			var wrapper = angular.element('<div class="markup-wrapper"></div>');
			var overlay = angular.element('<div class="markup-overlay"></div>');

			var activeCard = null;
			var activeDot = null;
			var activeItem = null;
			var activeIsNew = false;

			element.after(wrapper);
			wrapper.append(element);
			wrapper.append(overlay);

			function getList(){

				var list = ngModel.$viewValue;

				if(!angular.isArray(list)){
					list = [];
					ngModel.$setViewValue(list);
				}

				return list;

			}

			function removeCard(){

				if(activeCard){
					activeCard.remove();
					activeCard = null;
				}

				if(activeDot){
					activeDot.removeClass('active');
					activeDot = null;
				}

				activeItem = null;
				activeIsNew = false;

			}

			function positionCard(card, x, y){

				card.css({
					visibility:'hidden',
					left:'0px',
					top:'0px'
				});

				overlay.append(card);

				var overlayRect = overlay[0].getBoundingClientRect();
				var cardRect = card[0].getBoundingClientRect();

				var pointX = overlayRect.width * (x / 100);
				var pointY = overlayRect.height * (y / 100);

				var left = pointX + 18;
				var top = pointY - 20;
				var openLeft = false;

				if(left + cardRect.width > overlayRect.width){
					left = pointX - cardRect.width - 18;
					openLeft = true;
				}

				if(left < 8)
					left = 8;

				if(top + cardRect.height > overlayRect.height)
					top = overlayRect.height - cardRect.height - 8;

				if(top < 8)
					top = 8;

				card.toggleClass('left', openLeft);

				card.css({
					visibility:'visible',
					left:left + 'px',
					top:top + 'px'
				});

			}

			function openCard(item, dot, isNew){

				removeCard();

				activeItem = item;
				activeDot = dot || null;
				activeIsNew = isNew;

				if(activeDot)
					activeDot.addClass('active');

				var card = angular.element(`
					<div class="markup-card">
						<div class="markup-card-header">
							<div class="markup-card-title">
								${isNew ? 'Add message' : 'Markup message'}
							</div>

							<button
								type="button"
								class="markup-card-close"
								aria-label="Close">
								&times;
							</button>
						</div>

						<textarea
							class="markup-card-message"
							placeholder="Enter a message..."></textarea>

						<div class="markup-card-color-row">
							<span>Dot color</span>

							<input
								type="color"
								class="markup-card-color">
						</div>

						<div class="markup-card-actions">
							<button
								type="button"
								class="markup-card-button markup-card-save">
								Save
							</button>

							<div class="markup-card-spacer"></div>

							<button
								type="button"
								class="markup-card-button markup-card-delete">
								Delete
							</button>
						</div>
					</div>
				`);

				var textarea = card[0].querySelector('.markup-card-message');
				var colorInput = card[0].querySelector('.markup-card-color');
				var saveButton = card[0].querySelector('.markup-card-save');
				var deleteButton = card[0].querySelector('.markup-card-delete');
				var closeButton = card[0].querySelector('.markup-card-close');

				textarea.value = item.message || '';
				colorInput.value = item.color || '#ff5252';

				if(isNew)
					deleteButton.textContent = 'Cancel';

				angular.element(colorInput).on('input', function(){

					item.color = colorInput.value;

					if(activeDot)
						activeDot.css('background', item.color);

				});

				angular.element(saveButton).on('click', function(e){

					e.stopPropagation();

					scope.$apply(function(){

						item.message = textarea.value;
						item.color = colorInput.value;

						var list = getList();

						if(activeIsNew)
							list.push(item);

						ngModel.$setViewValue(list);
						ngModel.$setDirty();

						removeCard();
						render();

					});

				});

				angular.element(deleteButton).on('click', function(e){

					e.stopPropagation();

					scope.$apply(function(){

						if(!activeIsNew){

							var list = getList();
							var index = list.indexOf(item);

							if(index > -1)
								list.splice(index, 1);

							ngModel.$setViewValue(list);
							ngModel.$setDirty();

						}

						removeCard();
						render();

					});

				});

				angular.element(closeButton).on('click', function(e){

					e.stopPropagation();

					scope.$apply(function(){

						removeCard();
						render();

					});

				});

				card.on('click', function(e){
					e.stopPropagation();
				});

				activeCard = card;

				positionCard(card, item.x, item.y);

				$timeout(function(){
					textarea.focus();
				});

			}

			function render(){

				removeCard();
				overlay.empty();

				getList().forEach(function(item){

					var dot = angular.element(
						'<button type="button" class="markup-dot" aria-label="View markup message"></button>'
					);

					dot.css({
						left:item.x + '%',
						top:item.y + '%',
						background:item.color || '#ff5252'
					});

					dot.on('click', function(e){

						e.preventDefault();
						e.stopPropagation();

						scope.$apply(function(){
							openCard(item, dot, false);
						});

					});

					overlay.append(dot);

				});

			}

			overlay.on('click', function(e){

				if(e.target !== overlay[0])
					return;

				var rect = overlay[0].getBoundingClientRect();

				if(!rect.width || !rect.height)
					return;

				var x = ((e.clientX - rect.left) / rect.width) * 100;
				var y = ((e.clientY - rect.top) / rect.height) * 100;

				x = Math.max(0, Math.min(100, x));
				y = Math.max(0, Math.min(100, y));

				scope.$apply(function(){

					var item = {
						x:x,
						y:y,
						message:'',
						color:'#ff5252'
					};

					var dot = angular.element(
						'<button type="button" class="markup-dot active" aria-label="New markup message"></button>'
					);

					dot.css({
						left:item.x + '%',
						top:item.y + '%',
						background:item.color
					});

					overlay.append(dot);

					openCard(item, dot, true);

				});

			});

			function outsideClick(e){

				if(!activeCard)
					return;

				if(wrapper[0].contains(e.target))
					return;

				scope.$applyAsync(function(){
					removeCard();
				});

			}

			$document.on('click', outsideClick);

			ngModel.$render = render;

			element.on('load', function(){
				$timeout(render);
			});

			scope.$on('$destroy', function(){

				$document.off('click', outsideClick);
				removeCard();

			});

			$timeout(render);

		}
	};

});




app.directive('contextMenu', function($document, $compile){
	return {
		restrict: 'A',
		scope: false,

		link: function(scope, element, attrs){
			let menuEl;
			let menuScope;

			let close = ()=>{
				if(menuEl){
					menuEl.remove();
					menuEl = null;
				}

				if(menuScope){
					menuScope.$destroy();
					menuScope = null;
				}

				$document.off('mousedown', outsideClick);
				$document.off('contextmenu', outsideClick);
				$document.off('scroll', outsideClick);
			};

			let outsideClick = e=>{
				if(menuEl && !menuEl[0].contains(e.target))
					close();
			};

			let open = e=>{
				e.preventDefault();
				e.stopPropagation();

				close();

				let items	= scope.$eval(attrs.contextMenu) || [];
				let data	= attrs.contextData ? scope.$eval(attrs.contextData) : {};
				console.log('open context menu', {items, data})

				data = Object.assign({}, data, {
					$event: e
				});

				menuScope = scope.$new();

				menuScope._contextMenu = {
					items:	items,

					click: action=>{
						close();

						if(action.fn)
							action.fn(data);
					}
				};

				menuEl = angular.element(`
					<div class="context-menu-directive md-whiteframe-6dp" style="position:fixed; z-index:100000000; background:white; min-width:180px; padding:8px 0;">
						<md-menu-item ng-repeat="action in _contextMenu.items">
							<md-button ng-click="_contextMenu.click(action)">
								<i ng-if="action.icon" class="fa fa-{{action.icon}}" style="width:24px;"></i>
								{{action.title}}
							</md-button>
						</md-menu-item>
					</div>
				`);

				menuEl.css({
					position:	'fixed',
					left:		e.clientX + 'px',
					top:		e.clientY + 'px',
					zIndex:	10000
				});

				angular.element(document.body).append(menuEl);
				$compile(menuEl)(menuScope);
				if(!scope.$root.$$phase)
					menuScope.$digest();

				let rect = menuEl[0].getBoundingClientRect();

				if(rect.right > window.innerWidth)
					menuEl.css('left', Math.max(5, e.clientX - rect.width) + 'px');

				if(rect.bottom > window.innerHeight)
					menuEl.css('top', Math.max(5, e.clientY - rect.height) + 'px');

				$document.on('mousedown', outsideClick);
				$document.on('contextmenu', outsideClick);
				$document.on('scroll', outsideClick);
			};

			element.on('contextmenu', open);

			scope.$on('$destroy', ()=>{
				element.off('contextmenu', open);
				close();
			});
		}
	};
});


app.directive('print', ()=>{
	return {
		restrict: 'A',
		link: (scope, elem, attrs)=>{
			console.log({elem})
			elem.on('click', ()=>{
				console.log('print', attrs)
				let target = document.querySelector(attrs.print);

				if(!target)
					return;

				let frame = document.createElement('iframe');

				frame.style.position = 'fixed';
				frame.style.right = '0';
				frame.style.bottom = '0';
				frame.style.width = '0';
				frame.style.height = '0';
				frame.style.border = '0';

				document.body.appendChild(frame);

				let doc = frame.contentWindow.document;
				let styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
					.map(style=>style.outerHTML)
					.join('');

				doc.open();
				doc.write(`
					<!doctype html>
					<html>
						<head>
							<meta charset="utf-8">
							<title>Print</title>
							${styles}
							<style>
								@page {
									margin: 0.5in;
								}

								html,
								body {
									margin: 0;
									padding: 0;
									overflow: visible;
								}
								
								@media print {
									.noprint,
									.noprint *,
									.noPrint,
									.noPrint *,
									.no-print,
									.no-print * {
										display: none !important;
									}
								}
							</style>
						</head>
						<body>
							${target.outerHTML}
						</body>
					</html>
				`);
				doc.close();

				frame.onload = ()=>{
					setTimeout(()=>{
						frame.contentWindow.focus();
						frame.contentWindow.print();

						setTimeout(()=>{
							frame.remove();
						}, 1000);
					}, 250);
				};
			});

			scope.$on('$destroy', ()=>{
				elem.off('click');
			});
		}
	};
});













//MARKDOWN+ 10/26/26 (AI Stage): drop-in replacement for the `let markPromise; app.directive('markdown', ...)` block in the platform directives.js
window.mdPlus = window.mdPlus || (()=>{
	//==BEGIN mdPlus==
	// One markdown renderer for the platform directive and course.js (course.content). Built on marked's own API:
	// a private marked instance (new marked.Marked) so the global marked used elsewhere is NOT changed.
	let md = null, queue = null;
	let nonce = Math.random().toString(36).slice(2, 10);
	let esc = s=>String(s).replace(/[&<>"']/g, c=>({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;'})[c]);
	let host = ()=>typeof location != 'undefined' && location.host ? location.host.toLowerCase() : '';
	// strict allowlist. type 'video' (default) or 'embed' -> {kind: 'iframe'|'video', src, doc} built from validated ids only, or null
	let media = (raw, type)=>{
		let url;
		try{
			url = new URL(String(raw||'').trim());
		}catch(e){
			return null;
		}
		if(!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
			return null;
		let h = url.hostname.toLowerCase(), p = url.pathname, m, id;
		if(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be'].includes(h)){
			if(h == 'youtu.be')
				id = p.split('/')[1];
			else if(p == '/watch')
				id = url.searchParams.get('v');
			else if((m = p.match(/^\/(?:embed|shorts|live)\/([^/]+)/)))
				id = m[1];
			return /^[\w-]{11}$/.test(id||'') ? {kind: 'iframe', src: `https://www.youtube.com/embed/${id}`} : null;
		}
		if(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(h)){
			m = p.match(/^\/(?:video\/)?(\d{5,12})(?:\/|$)/);
			return m ? {kind: 'iframe', src: `https://player.vimeo.com/video/${m[1]}`} : null;
		}
		if(h == 'drive.google.com'){
			id = ((m = p.match(/^\/file\/d\/([\w-]+)/)) && m[1]) || (p == '/open' && url.searchParams.get('id'));
			return /^[\w-]{10,100}$/.test(id||'') ? {kind: 'iframe', src: `https://drive.google.com/file/d/${id}/preview`, doc: type == 'embed'} : null;
		}
		if(h == 'docs.google.com' && (m = p.match(/^\/(document|presentation|spreadsheets)\/d\/([\w-]{10,100})(?:\/|$)/)))
			return {kind: 'iframe', src: `https://docs.google.com/${m[1]}/d/${m[2]}/preview`, doc: type == 'embed'};
		if(type == 'embed' && h == 'docs.google.com' && (m = p.match(/^\/forms\/d\/(e\/)?([\w-]{10,120})(?:\/|$)/)))
			return {kind: 'iframe', src: `https://docs.google.com/forms/d/${m[1]||''}${m[2]}/viewform?embedded=true`, doc: true};
		if(type != 'embed' && url.protocol == 'https:' && /\.(mp4|webm|ogg|mov)$/i.test(p))
			return {kind: 'video', src: url.href};
		return null;
	};
	let element = v=>v.kind == 'video'
		? `<div class="md-media"><video src="${esc(v.src)}" controls preload="metadata"></video></div>`
		: `<div class="md-media md-frame${v.doc ? ' md-doc' : ''}" style="position:relative;width:100%;${v.doc ? 'height:640px' : 'padding-top:56.25%'}"><iframe style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" src="${esc(v.src)}" title="${v.doc ? 'Embedded document' : 'Embedded video'}" loading="lazy" frameborder="0" referrerpolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-popups allow-presentation allow-forms" allow="fullscreen; picture-in-picture; encrypted-media" allowfullscreen></iframe></div>`;
	let slot = i=>`<div class="md-video md-v-${nonce}-${i}"></div>`;
	let CALLOUT = ['note', 'tip', 'important', 'warning', 'caution'];
	// [!VIDEO caption](url) / [!EMBED caption](url) / [!FILE name](url): the label defines the element. No brackets or newlines in the caption.
	let TAG = /^\[!(video|embed|file)(?:[ \t]+([^\[\]\n]*?))?[ \t]*\]\([ \t]*<?((?:[^\s<>()]|\([^\s<>()]*\))*)>?[ \t]*\)/i;
	let LABEL = {video: 'Video', embed: 'Embed', file: 'File'};
	let web = u=>/^https?:\/\/[^\s]+$/i.test(u||'') ? u : ''; // only http(s) becomes a link; anything else is text
	let tagLink = t=>{ // inline / fallback form: a safe plain link (or text), never an iframe
		let text = esc(t.caption || (t.tag == 'file' ? 'Download file' : LABEL[t.tag])), href = web(t.url);
		if(!href)
			return text;
		let cls = t.tag == 'file' ? 'md-file' : 'md-ext';
		return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="${cls}">${t.tag == 'file' ? '<span class="md-file-icon">\ud83d\udcce</span> ' : ''}${text}</a>`;
	};
	let ext = {
		extensions: [{
			name: 'mdTag',
			level: 'inline',
			start: src=>{
				let i = src.indexOf('[!');
				return i < 0 ? undefined : i;
			},
			tokenizer: function(src){
				let m = TAG.exec(src);
				if(m)
					return {type: 'mdTag', raw: m[0], tag: m[1].toLowerCase(), caption: (m[2]||'').trim(), url: m[3]};
			},
			renderer: function(t){
				return tagLink(t);
			},
		}],
		renderer: {
			// a paragraph that is only one [!VIDEO](url) / [!EMBED](url) with an allowlisted URL -> player (caption below); a lone [!FILE] -> file card
			paragraph: function(t){
				let parts = (t.tokens||[]).filter(x=>!(x.type == 'text' && !String(x.raw).trim()) && x.type != 'br');
				let x = parts.length == 1 && parts[0].type == 'mdTag' ? parts[0] : null;
				if(!x)
					return false;
				if(x.tag == 'file')
					return `<p class="md-file-card">${tagLink(x)}</p>\n`;
				let v = queue && media(x.url, x.tag);
				if(!v)
					return false;
				let cap = x.caption ? `<p class="md-caption">${esc(x.caption)}</p>\n` : '';
				return `<div class="md-figure">${slot(queue.push(v)-1)}\n${cap}</div>\n`;
			},
			link: function(t){
				let out = md.Renderer.prototype.link.call(this, t);
				let m = /^https?:\/\/([^/?#]+)/i.exec(t.href||'');
				if(!m || m[1].toLowerCase() == host() || !/^<a /.test(out))
					return out;
				return '<a target="_blank" rel="noopener noreferrer" class="md-ext" '+out.slice(3);
			},
			checkbox: function(t){
				return t.checked ? '<span class="md-check md-checked">\u2611</span> ' : '<span class="md-check">\u2610</span> ';
			},
			listitem: function(item){
				if(!item.task)
					return false;
				//MARKDOWN+ 10/27/26: older marked (e.g. 15.x) has no checkbox token in item.tokens, so add the box here; newer marked renders it from the token
				let box = (item.tokens||[]).some(t=>t.type == 'checkbox') ? '' : this.checkbox({checked: !!item.checked});
				return `<li class="md-task${item.checked ? ' md-done' : ''}">${box}${this.parser.parse(item.tokens, !!item.loose)}</li>\n`;
			},
			blockquote: function(t){
				let body = this.parser.parse(t.tokens), m, type, title = '';
				if((m = /^<p>\[!(note|tip|important|warning|caution)\][ \t]*\n?/i.exec(body))){ // > [!NOTE]
					type = m[1].toLowerCase();
					body = '<p>'+body.slice(m[0].length);
					body = body.replace(/^<p><\/p>\n?/, '');
					title = `<p class="md-callout-title">${type[0].toUpperCase()+type.slice(1)}</p>\n`;
				}else if((m = /^<p><strong>(note|tip|important|warning|caution):?<\/strong>/i.exec(body))) // > **Note:** text
					type = m[1].toLowerCase();
				if(!type || !CALLOUT.includes(type))
					return false;
				return `<blockquote class="md-callout md-callout-${type}">\n${title}${body}</blockquote>\n`;
			},
		},
	};
	let instance = ()=>{ // registered once, after the marked script has loaded
		if(md)
			return md;
		if(typeof marked == 'undefined' || !marked)
			return null;
		if(typeof marked.Marked != 'function') // very old marked: plain rendering, no extras
			return marked;
		md = new marked.Marked();
		md.use(ext);
		return md;
	};
	let CSS = [
		'.md a{color:#1a73e8;text-decoration:underline;cursor:pointer}',
		'.md a:hover{color:#0b57d0}',
		'.md li.md-task{list-style:none;margin-left:-1.4em}',
		'.md .md-check{display:inline-block;width:1.2em;color:#4f46e5;font-size:1.1em;line-height:1}',
		'.md li.md-done{color:#6b7280}',
		'.md .md-media{margin:8px 0 16px;max-width:860px}',
		'.md .md-frame{background:#000}',
		'.md video{display:block;width:100%;max-width:100%}',
		'.md .md-figure{margin:8px 0 16px;max-width:860px}',
		'.md .md-figure .md-media{margin:0}',
		'.md .md-caption{margin:6px 0 0;font-size:13px;color:#6b7280}',
		'.md .md-doc{max-width:none}',
		'.md a.md-file{display:inline-block;padding:8px 12px;border:1px solid #d1d5db;background:#f9fafb;text-decoration:none;color:#1f2937}',
		'.md a.md-file:hover{background:#eef2ff;border-color:#a5b4fc}',
		'.md .md-file-card{margin:8px 0}',
		'.md .md-callout{margin:12px 0;padding:8px 12px;border-left:4px solid #3b82f6;background:#eff6ff;color:inherit}',
		'.md .md-callout p{margin:4px 0}',
		'.md .md-callout-title{font-weight:600}',
		'.md .md-callout-tip{border-color:#10b981;background:#ecfdf5}',
		'.md .md-callout-important{border-color:#8b5cf6;background:#f5f3ff}',
		'.md .md-callout-warning{border-color:#f59e0b;background:#fffbeb}',
		'.md .md-callout-caution{border-color:#ef4444;background:#fef2f2}',
	].join('\n');
	return {
		version: '10/26/26',
		media,
		instance,
		full: ()=>!!instance() && instance() === md, // the extras are available (marked with the Marked class)
		CSS,
		// once per page: the scoped .md styles
		css: ()=>{
			if(typeof document == 'undefined' || document.getElementById('md-plus-css'))
				return false;
			let s = document.createElement('style');
			s.id = 'md-plus-css';
			s.textContent = CSS;
			(document.head || document.documentElement).appendChild(s);
			return true;
		},
		// markdown -> clean(html) -> placeholders swapped for allowlisted players. clean = $sanitize (or any html cleaner)
		render: (text, clean)=>{
			let src = text == null ? '' : String(text);
			let m = instance();
			if(!m)
				return '';
			queue = [];
			let list, html;
			try{
				html = m.parse(src);
			}finally{
				list = queue;
				queue = null;
			}
			html = clean ? clean(html) : html;
			list.forEach((v, i)=>{
				let s = slot(i), at = html.indexOf(s);
				if(at > -1) // exact placeholder only (a nonce authors cannot guess), never parsed back out of the html
					html = html.slice(0, at)+element(v)+html.slice(at+s.length);
			});
			return html;
		},
	};
	//==END mdPlus==
})();

//MARKDOWN+ 10/26/26 (AI Stage): same attribute API + $sanitize as before; adds [!VIDEO caption](url) players, [!EMBED](url) documents, [!FILE name](url) cards, styled checklists,
// links that open in a new tab, > [!NOTE] callouts and scoped .md styles. Fixes: null/undefined value, older renders overwriting newer ones.
// NOTE: the marked URL is unpinned (latest, 18.x today). Pinning it (e.g. marked@18.1.2) is recommended.
let markPromise;
app.directive('markdown', function($sanitize) {
	return {
		restrict: 'A',
		link: function(scope, element, attr) {
			let seq = 0;
			element.addClass('md');
			window.mdPlus.css();
			scope.$on('$destroy', ()=>{
				seq = -1;
			});
			scope.$watch(function() {return element.attr('markdown'); }, function(newValue){
				let mine = ++seq;
				markPromise = markPromise || $.getScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js').fail(()=>{
					markPromise = null; // let the next change try again
				});
				markPromise.then(()=>{
					if(mine !== seq) // a newer value (or $destroy) came in while marked was loading
						return;
					element.html(window.mdPlus.render(newValue, $sanitize));
				});
			});
		}
	};
});

