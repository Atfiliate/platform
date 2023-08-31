var fs			= require('fs');
var firebase	= require('firebase-admin');

if(process.env.config){
	let config = JSON.parse(process.env.config);
	if(config?.firebase?.databaseURL){
		firebase.initializeApp({
			databaseURL: config.firebase.databaseURL,
			// credential: firebase.credential.cert(JSON.parse(fs.readFileSync('./cloud/service.json', 'utf8')))
			credential: firebase.credential.cert(JSON.parse(process.env.googleJson))
		});
		firebase.firestore().settings({ignoreUndefinedProperties:true});
	}else{
		console.log('Firebase databaseURL not listed in config.')
	}
}