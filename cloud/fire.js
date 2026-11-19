var firebase	= require('firebase-admin');

if(process.env.config){
	let config = JSON.parse(process.env.config);
	if(config?.firebase?.projectId){
		firebase.initializeApp({
			projectId: config.firebase.projectId,
			credential: firebase.credential.cert(JSON.parse(process.env.googleJson))
		});
		firebase.firestore().settings({ignoreUndefinedProperties:true});
	}else{
		console.log('Firebase projectId not listed in config.')
	}
}