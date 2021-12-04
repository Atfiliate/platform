var fs			= require('fs');
var firebase	= require('firebase-admin');

console.log('---------------------------INIT FIREBASE------------------------------------')
console.log(process.env.config)
let databaseURL = process.env.config && process.env.config.firebase && process.env.config.firebase.databaseURL;
console.log({databaseURL});

if(databaseURL && process.env.googleJson){
	firebase.initializeApp({
		databaseURL,
		// credential: firebase.credential.cert(JSON.parse(fs.readFileSync('./cloud/service.json', 'utf8')))
		credential: firebase.credential.cert(JSON.parse(process.env.googleJson))
	});
}