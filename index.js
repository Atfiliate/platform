var express = require('express');
var bodyParser = require('body-parser');
var busboy = require('connect-busboy');
var compression = require('compression');
var multer = require('multer');
var {Readable} = require('stream');

var app = express();

// A cloud handler that forgets a .catch() must not take the whole server down.
process.on('unhandledRejection', e=>console.error('Unhandled rejection:', e && (e.stack || e.message) || e));

let Config = {};
if(process.env.config){
	try{
		Config = JSON.parse(process.env.config);
	}catch(e){
		console.error('Invalid process.env.config JSON', e);
	}
}

let setupMode = !Config?.firebase?.projectId;

app.set('port', (process.env.PORT || 5000));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.disable('x-powered-by');
app.use(require('./cloud/headers.js').create(process.env));
app.use(compression());
app.use(express.static(__dirname + '/public'));

// Request bodies are parsed only on the routes that take them (cloud handlers).
// Large uploads (data: URIs, files) stay possible there; every other route gets a
// small body. Override with env bodyLimit (e.g. 25mb) and uploadLimitMb.
const CLOUD_BODY_LIMIT = process.env.bodyLimit || '50mb';
const UPLOAD_LIMIT_MB = Number(process.env.uploadLimitMb) || 50;
const cloudBody = [
	bodyParser.json({limit: CLOUD_BODY_LIMIT}),
	bodyParser.urlencoded({extended: true, limit: CLOUD_BODY_LIMIT, parameterLimit: 5000}),
	multer({limits: {fileSize: UPLOAD_LIMIT_MB * 1024 * 1024, files: 20, fields: 1000, parts: 1100}}).any(),
	busboy({limits: {fileSize: UPLOAD_LIMIT_MB * 1024 * 1024, files: 20, fields: 1000}})
];
const smallBody = [
	bodyParser.json({limit: '100kb'}),
	bodyParser.urlencoded({extended: true, limit: '100kb'})
];

if(setupMode){
	app.use(function(req, res){
		res.render('pages/setup');
	});
}else{
	var {getApps} = require('firebase-admin/app');
	var {getFirestore} = require('firebase-admin/firestore');
	var {getAuth} = require('firebase-admin/auth');
	var fire = require("./cloud/fire.js");
	var auto = require("./cloud/auto.js");
	var shell = require("./cloud/shell.js");

	let $settings = {subSite: {}};

	if(getApps().length){
		let db = getFirestore();
		db.collection('admin').doc('settings')
		.onSnapshot((doc)=>{
			let s = doc.data() || {};
			if(!s.subSite)
				s.subSite = {};
			$settings = s;
		});
	}

	auto.startup();
	auto.cache();

	app.use(auto.FireMiddleware);

	// Firebase Auth helper pages (/__/auth/*) served from this domain, so sign-in redirects stay same-origin.
	app.get('/__/auth/*path', (req, res) => {
		const url = `https://${Config.firebase.projectId}.firebaseapp.com${req.originalUrl}`;
		fetch(url, {redirect: 'manual'}).then(r=>{
			res.status(r.status);
			['content-type', 'cache-control', 'location', 'content-security-policy', 'x-frame-options'].forEach(h=>{
				let v = r.headers.get(h);
				if(v) res.setHeader(h, v);
			});
			if(!r.body) return res.end();
			Readable.fromWeb(r.body).on('error', ()=>res.end()).pipe(res);
		}).catch(e=>{
			console.log('Auth helper fetch failed', e && e.message);
			if(!res.headersSent) res.status(502).send('Auth helper unavailable');
		});
	});
	
	function renderApp(request, response){
		if(request.query.rootSetup){
			response.render('pages/setup');
		}else{
			let config = {};
			Object.assign(config, Config);
			let siteProject = shell.project(auto.getProject, 'site');
			let site = shell.read(siteProject);
			shell.brand(config, site);
			let settings = $settings.subSite[request.headers.host];
			if(settings)
				Object.assign(config, settings);
				
			let project = auto.getProject(request.params.view, request.query.v);
			if(project?.page?.title)
				config.title = project.page.title;
			if(project?.page?.description)
				config.description = project.page.description;
			
			
			app.render('pages/index', {config, shell: shell.locals(siteProject, site)}, (e, html)=>{
				if(e)
					return response.status(500).send(e.message || e);
				response.send(html);
			});
		}
	}
	function clientRedirect(req, res){
		let path = '/#/project/' + encodeURIComponent(req.params.view);
	
		if(req.params.id)
			path += '/' + encodeURIComponent(req.params.id);
	
		let query = new URLSearchParams(req.query).toString();
	
		if(query)
			path += '?' + query;
	
		res.redirect(path);
	}


	app.options('/cloud/:path', auto.options);
	app.post('/cloud/:path', cloudBody, auto.cloud);
	app.get('/cloud/:path', smallBody, auto.cloud);

	app.options('/cloud/:path/:id', auto.options);
	app.post('/cloud/:path/:id', cloudBody, auto.cloud);
	app.get('/cloud/:path/:id', smallBody, auto.cloud);

	app.get('/component/:path', auto.component);

	app.get('/project/:projId', auto.project);
	app.get('/project/:projId/component/:component', auto.project);
	app.get('/project/component/:component', auto.project);

	app.options('/project/:projId/cloud/:cloud', auto.options);
	app.options('/project/:projId/cloud/:cloud/:id', auto.options);
	app.options('/project/cloud/:cloud', auto.options);

	app.get('/project/:projId/cloud/:cloud', smallBody, auto.project);
	app.post('/project/:projId/cloud/:cloud', cloudBody, auto.project);
	app.get('/project/:projId/cloud/:cloud/:id', smallBody, auto.project);
	app.post('/project/:projId/cloud/:cloud/:id', cloudBody, auto.project);
	app.get('/project/cloud/:cloud', smallBody, auto.project);
	app.post('/project/cloud/:cloud', cloudBody, auto.project);
	
	// Phase 0: root/admin-only health check and dry-run install plan (names only, read-only).
	var health = require('./cloud/health.js').create({Fire: auto.Fire, auth: ()=>getAuth(), env: process.env});
	app.get('/__core/health', health.route('health'));
	app.get('/__core/install/plan', health.route('plan'));

	app.get('/', renderApp);
	app.get('/:view', renderApp);
	app.get('/:view/:id', renderApp);
}

app.listen(app.get('port'), function(){
	console.log('Node app is running on port', app.get('port'));
	console.log(setupMode ? 'Setup mode enabled' : 'App mode enabled');
});