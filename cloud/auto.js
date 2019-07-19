var firebase	= require('firebase-admin');
var request		= require('request');
var http		= require('request-promise');
var cheerio 	= require('cheerio');
var Plivo		= require('plivo');
var Phaxio		= require('phaxio');
var cloudinary	= require('cloudinary');
var moment		= require('moment');
var mcache		= require('memory-cache');
var db 			= firebase.firestore();


if(process.env.phaxioKey)
	let phaxio = new Phaxio(process.env.phaxioKey, process.env.phaxioToken)

if(process.env.plivoId)
	let plivo = new Plivo.Client(process.env.plivoId, process.env.plivoToken);

if(process.env.cloudinaryName)
	cloudinary.config({
		cloud_name: process.env.cloudinaryName,
		api_key: process.env.cloudinaryKey,
		api_secret: process.env.cloudinaryToken
	});

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
				var code = snapshot.val();
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
		if(request.params.component){
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
					var code = cloud.code;
					try{
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
	}
}