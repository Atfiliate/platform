var fire = require("./cloud/fire.js");
var auto = require("./cloud/auto.js");
var stripe = require('./cloud/stripe.js');
// var google = require('./cloud/google.js');
var express = require('express');
var bodyParser = require('body-parser');
var busboy  = require('connect-busboy');
var compression = require('compression')


var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json({limit:'50mb'}));
app.use(bodyParser.urlencoded({extended:true, limit:'50mb'}));
app.use(busboy());
app.use(compression());

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
	response.render('pages/index');
});

app.options('/home/:path', auto.home)
app.get('/home/:path', auto.home)

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

app.get('/project/:projId/component/:component', auto.project)
app.get('/project/component/:component', auto.project)


app.options('/project/:projId/cloud/:cloud', auto.options)
app.get('/project/:projId/cloud/:cloud', auto.project)
app.post('/project/:projId/cloud/:cloud', auto.project)
app.options('/project/cloud/:cloud', auto.options)
app.get('/project/cloud/:cloud', auto.project)
app.post('/project/cloud/:cloud', auto.project)


app.listen(app.get('port'), function() {
	console.log('Node app is running on port', app.get('port'));
});