var fs			= require('fs');
var firebase	= require('firebase-admin');

// console.log({
// 	projectId: process.env.googleProject,
// 	clientEmail: process.env.googleEmail,
// 	privateKey: process.env.googleKey
// })
if(process.env.firebase && process.env.googleJson)
	firebase.initializeApp({
		databaseURL: process.env.firebase,
		// credential: firebase.credential.cert(JSON.parse(fs.readFileSync('./cloud/service.json', 'utf8')))
		credential: firebase.credential.cert(JSON.parse(process.env.googleJson))
	});