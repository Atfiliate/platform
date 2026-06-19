var express = require('express');
var bodyParser = require('body-parser');
var busboy = require('connect-busboy');
var compression = require('compression');
var multer = require('multer');
var request = require('request');

var app = express();

let Config = {};
if(process.env.config){
	try{
		Config = JSON.parse(process.env.config);
	}catch(e){
		console.error('Invalid process.env.config JSON', e);
	}
}

let setupMode = !Config?.firebase?.databaseURL || !Config?.firebase?.projectId;

app.set('port', (process.env.PORT || 5000));
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({extended:true, limit:'50mb'}));
app.use(multer().any());
app.use(busboy());
app.use(compression());

if(setupMode){
	app.get('*', function(req, res){
		res.render('pages/setup');
	});
}else{
	var firebase = require("firebase-admin");
	var fire = require("./cloud/fire.js");
	var auto = require("./cloud/auto.js");
	var stripe = require('./cloud/stripe.js');

	let $settings = {subSite: {}};

	if(firebase.apps.length){
		let db = firebase.firestore();
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

	app.use('/__/auth/', (req, res) => {
		const url = `https://${Config.firebase.projectId}.firebaseapp.com${req.url}`;
		req.pipe(request(url)).pipe(res);
	});

	app.get('/', function(request, response){
		if(request.query.rootSetup){
			response.render('pages/setup');
		}else{
			let config = {};
			Object.assign(config, Config);

			let settings = $settings.subSite[request.headers.host];
			if(settings)
				Object.assign(config, settings);

			app.render('pages/index', {config}, (e, html)=>{
				if(e)
					return response.status(500).send(e.message || e);
				response.send(html);
			});
		}
	});

	app.get('/:root', auto.project);

	app.post('/stripe/customer', stripe.customer);
	app.post('/stripe/checkout', stripe.checkout);

	app.options('/cloud/:path', auto.options);
	app.post('/cloud/:path', auto.cloud);
	app.get('/cloud/:path', auto.cloud);

	app.options('/cloud/:path/:id', auto.options);
	app.post('/cloud/:path/:id', auto.cloud);
	app.get('/cloud/:path/:id', auto.cloud);

	app.get('/component/:path', auto.component);

	app.get('/project/:projId', auto.project);
	app.get('/project/:projId/component/:component', auto.project);
	app.get('/project/component/:component', auto.project);

	app.options('/project/:projId/cloud/:cloud', auto.options);
	app.options('/project/:projId/cloud/:cloud/:id', auto.options);
	app.options('/project/cloud/:cloud', auto.options);

	app.get('/project/:projId/cloud/:cloud', auto.project);
	app.post('/project/:projId/cloud/:cloud', auto.project);
	app.get('/project/:projId/cloud/:cloud/:id', auto.project);
	app.post('/project/:projId/cloud/:cloud/:id', auto.project);
	app.get('/project/cloud/:cloud', auto.project);
	app.post('/project/cloud/:cloud', auto.project);
}

app.listen(app.get('port'), function(){
	console.log('Node app is running on port', app.get('port'));
	console.log(setupMode ? 'Setup mode enabled' : 'App mode enabled');
});