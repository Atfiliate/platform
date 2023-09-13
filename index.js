var firebase = require("firebase-admin");
var fire = require("./cloud/fire.js");
var auto = require("./cloud/auto.js");
var stripe = require('./cloud/stripe.js');
// var google = require('./cloud/google.js');
var express = require('express');
var bodyParser = require('body-parser');
var busboy  = require('connect-busboy');
var compression = require('compression');
var multer = require('multer');
var request = require('request');


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

var app = express();

let Config = {};
if(process.env.config)
	Config = JSON.parse(process.env.config);

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(auto.FireMiddleware)
app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({extended:true, limit:'50mb'}));
// app.use(bodyParser.urlencoded());
app.use(multer().any());
app.use(busboy());
app.use(compression());

//I haven't actually seen this work properly...
if(Config && Config.firebase && Config.firebase.projectId){
	app.use('/__/auth/', (req, res) => {
	    const url = `https://${Config.firebase.projectId}.firebaseapp.com${req.url}`;
	    req.pipe(request(url)).pipe(res);
	});
}


// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response){
	if(!Config?.firebase?.databaseURL || request.query.rootSetup){
		response.render('pages/setup');
	}else{
		let config = {};
		Object.assign(config, Config)
		let settings = $settings.subSite[request.headers.host];
		if(settings)
			Object.assign(config, settings)
		app.render('pages/index', {config}, (e,html)=>{
			response.send(html);
		})
		// response.send()
		// response.render('pages/index', {config});
	}
});

// app.get('/home', auto.home)
// app.get('/home/:path', auto.home)

// app.options('/home/:path/update', auto.options)
// app.get('/home/:path/update', auto.homeUpdate)

app.get('/:root', auto.project)
app.post('/stripe/customer', stripe.customer)
app.post('/stripe/checkout', stripe.checkout)

// app.post('/google/auth', google.auth)
// app.get('/google/auth', google.auth)
app.options('/cloud/:path', auto.options)
app.post('/cloud/:path', auto.cloud)
app.get('/cloud/:path', auto.cloud)
app.options('/cloud/:path/:id', auto.options)
app.post('/cloud/:path/:id', auto.cloud)
app.get('/cloud/:path/:id', auto.cloud)
app.get('/component/:path', auto.component)

app.get('/project/:projId', auto.project)
app.get('/project/:projId/component/:component', auto.project)
app.get('/project/component/:component', auto.project)


app.options('/project/:projId/cloud/:cloud', auto.options)
app.options('/project/:projId/cloud/:cloud/:id', auto.options)
app.options('/project/cloud/:cloud', auto.options)

app.get('/project/:projId/cloud/:cloud', auto.project)
app.post('/project/:projId/cloud/:cloud', auto.project)
app.get('/project/:projId/cloud/:cloud/:id', auto.project)
app.post('/project/:projId/cloud/:cloud/:id', auto.project)
app.get('/project/cloud/:cloud', auto.project)
app.post('/project/cloud/:cloud', auto.project)


app.listen(app.get('port'), function() {
	console.log('Node app is running on port', app.get('port'));
});
