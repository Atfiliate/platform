var fs			= require('fs');
var firebase	= require('firebase-admin');

// console.log({
// 	projectId: process.env.googleProject,
// 	clientEmail: process.env.googleEmail,
// 	privateKey: process.env.googleKey
// })
let dbUrl = process.env.config && process.env.config.firebase && process.env.config.firebase.databaseURL;
if(dbUrl && process.env.googleJson)
	firebase.initializeApp({
		databaseURL: dbUrl,
		// credential: firebase.credential.cert(JSON.parse(fs.readFileSync('./cloud/service.json', 'utf8')))
		credential: firebase.credential.cert(JSON.parse(process.env.googleJson))
	});