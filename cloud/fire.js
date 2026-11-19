// Starts the default Firebase app from env config (projectId) and googleJson (service account).
const {initializeApp, cert} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');

if(process.env.config){
	let config = JSON.parse(process.env.config);
	if(config?.firebase?.projectId){
		initializeApp({
			projectId: config.firebase.projectId,
			credential: cert(JSON.parse(process.env.googleJson))
		});
		getFirestore().settings({ignoreUndefinedProperties: true});
	}else{
		console.log('Firebase projectId not listed in config.')
	}
}
