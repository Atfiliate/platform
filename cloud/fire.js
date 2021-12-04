var fs			= require('fs');
var firebase	= require('firebase-admin');

if(process.env.config){
	let config = JSON.parse(process.env.config);
	firebase.initializeApp({
		databaseURL: config.firebase.databaseURL,
		// credential: firebase.credential.cert(JSON.parse(fs.readFileSync('./cloud/service.json', 'utf8')))
		credential: firebase.credential.cert(JSON.parse(process.env.googleJson))
	});
}