var firebase	= require('firebase-admin');
var request		= require('request');
var http		= require('request-promise');
var cloudinary	= require('cloudinary');
var moment		= require('moment');
var mcache		= require('memory-cache');

if(firebase.apps.length)
	var db 		= firebase.firestore();

if(process.env.cloudinaryName)
	cloudinary.config({
		cloud_name: process.env.cloudinaryName,
		api_key: process.env.cloudinaryKey,
		api_secret: process.env.cloudinaryToken
	});


function pathValue(obj, path, val){
	path = typeof path == 'string' ? path.split('[').join('.').split('.') : path;
	var attr = path && path.shift();
	if(attr && attr.indexOf(']') != -1)
		attr = attr.replace('[', '').replace(']', '');
	if(val !== undefined){
		if(path.length){
			if(obj[attr]){
				pathValue(obj[attr], path, val)
			}else{
				obj[attr] = {};
				pathValue(obj[attr], path, val)
			}
		}else if(val == '_delete_'){
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

Array.prototype._flat = Array.prototype.flat;
//fix because someone added a 'flat' to arrays in standards :S:)
Array.prototype.flat = function(col, placeholder){
	if(col)
		return this.map(function(i){
			return i[col] && i[col] === undefined ? placeholder : i[col];
		})
	else
		return this._flat();
}
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
Array.prototype.unique = function(col){
	if(col)
		return this.flat(col).getUnique();
	else
		return this.getUnique();
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
		if(firebase.apps.length !== 0){
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
	cloud: function(request, response){
		if(request.headers.origin){
			response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
			response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
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
	homeUpdate: (request, response)=>{
		module.exports.home(request, response);
	},
	home: (request, response)=>{
		var mkdir = require('mkdirp');
		var fs = require('fs');
		var gid = process.env.a_gid || 'iZTQIVnPzPW7b2CzNUmO';
		var pid = process.env.a_pid || 'LIJGdBKzktXHntCWjoln';
		var cid = request.params.path || 'index.html';

		function hashIt(s){
			return s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);
		}
		function send(code){
			if(request.body.update){
				response.send('Cache Updated')
			}else if(cid){
				if(cid.indexOf('.js') != -1)
					response.setHeader("Content-Type", 'application/javascript');
				else if(cid.indexOf('.htm') != -1)
					response.setHeader("Content-Type", 'text/html');
				else if(cid.indexOf('.css') != -1)
					response.setHeader("Content-Type", 'text/css');
				response.send(code)
			}else{
				response.send('');
			}
		}

		var path = `home/${gid}/${pid}/${cid}`;
		var hashPath = 'temp/component'+hashIt(path);
		mkdir('temp');

		var record = mcache.get(path);
		if(record && request.query.update != process.env.a_key){
			fs.readFile(hashPath, 'utf8', (e,d)=>{
				if(e){
					console.log(e)
					send('404')
				}else{
					console.log('sending cached version', hashPath)
					send(d)
				}
			})
		}else{
			http({
				method: 'POST',
				uri: 'https://a.alphabetize.us/project/code/cloud/site',
				body: {gid,pid,cid},
				json: true
			}).then(component=>{
				var code = component && component.code || '';
				var time = component && component.cache || 360000;
				fs.writeFile(hashPath, code, (e)=>{
					if(e){
						console.log('sending error - could not write file.')
						send(e)
					}else{
						console.log('update local and send live code')
						mcache.put(path, 'loaded', time);
						send(code)
					}
				})
			})
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
		if(request.params.root){
			request.params.component = request.params.root;
			request.params.projId = 'root';
		}
		if(firebase.apps.length === 0){
			response.send('Firebase Not Setup');
		}else if(request.params.component){
			var path = request.params.component;
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

			var cachePath = request.params.projId+'/'+path;
			var cache = mcache.get(cachePath)
			if(cache){
				response.send(cache);
			}else{
				console.log('NOTFROMCACHE-project-component----------> '+request.params.projId+'/'+path);
				if(request.params.projId)
					var ref = firebase.database().ref('project/'+request.params.projId+'/component').child(path);
				else
					var ref = firebase.database().ref('project/private/component').child(path);

				ref.once('value', function(snapshot){
					var component = snapshot.val();
					try{
						if(component.cache){
							mcache.put(cachePath, component.code, Number(component.cache));
						}
						response.send(component.code)
					}catch(e){
						response.send(e);
					}
				});
			}
		}else if(request.params.cloud){
			var path = request.params.cloud;
				path = path.split('.').join('_');

			if(request.headers.origin){
				response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
				response.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
				response.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Content-Length, X-Requested-With, X-Custom-Header')
			}

			var cachePath = request.params.projId+'/cloud/'+path;
			var code = mcache.get(cachePath)
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
				console.log('NOTFROMCACHE-project-cloud----------> '+request.params.projId+'/'+path);
				if(request.params.projId)
					var ref = firebase.database().ref('project/'+request.params.projId+'/cloud').child(path);
				else
					var ref = firebase.database().ref('project/private/cloud').child(path);

				ref.once('value', function(snapshot){
					var cloud = snapshot.val();
					try{
						var code = cloud.code;
						if(cloud.cache){
							mcache.put(cachePath, cloud.code, Number(cloud.cache));
						}

						var js; eval('js = '+code);
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