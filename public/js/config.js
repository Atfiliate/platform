/*
	global app, firebase
*/

app.factory('config', function(){
	var config = localStorage.getItem('whois');
	config = JSON.parse(config);
	
	// var config = {
	// 	origin: 'https://your.domain.com',
	// 	mixpanel: '',
	// 	clientId: '',
	// 	firebase: {
	// 		apiKey: "",
	// 		authDomain: "",
	// 		databaseURL: "",
	// 		storageBucket: "",
	// 		messagingSenderId: ""
	// 	},
	// 	stripe: 			'',
	// 	cloudinary: {
	// 		cloudName:		'',
	// 		uploadPreset:	''
	// 	}
	// }
	firebase.initializeApp(config.firebase);
	console.log('init config')
	return config;
})