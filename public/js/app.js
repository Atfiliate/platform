/*
	global app, angular, firebase, gapi, $script, localStorage, navigator
	Load even w/out whois.
*/

var it = {};
// (function() {
// 	'use strict';
// 	if ('serviceWorker' in navigator) {
// 		navigator.serviceWorker
// 		.register('service-worker.js')
// 		.then(function() {
// 			console.log('Service Worker Registered');
// 		});
// 	}
// })();
if(window.location.protocol == 'http:')
	window.location = window.location.href.replace('http:', 'https:')

let imports = ['ngMaterial','firebase','ngRoute','ngSanitize','chart.js'];
if(window.Raven)
	imports.push('ngRaven')
	
var app = angular.module('app', imports);
app.config(function($routeProvider, $locationProvider, $controllerProvider, $provide, $compileProvider, $mdThemingProvider, $injector, $sanitizeProvider) {
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|file|data|sms|tel):/);
	$locationProvider.hashPrefix('');
	app.lazy = {
		controller: $controllerProvider.register,
		factory: 	$provide.factory,
		service: 	$provide.service,
		theme:		$mdThemingProvider,
		compile:	$compileProvider,
		injector:	$injector
	};
	var dep = {
		deps: function($q, $rootScope, $routeParams, Auth){
			var deferred = $q.defer();
			var module = window.location.hash.split('/')[1];
			var dependencies = [
				'modules/'+module+'/ctrl.js',
			];
			$script(dependencies, function() {
				deferred.resolve();
			});
			return deferred.promise;
		}
	}
	$routeProvider
		.when('/:module', {
			templateUrl: function($routeParams){
				return 'modules/'+$routeParams.module+'/index.html'
			},
			reloadOnSearch: false,
			resolve: dep
		})
		.when('/:module/:view', {
			templateUrl: function($routeParams){
				return 'modules/'+$routeParams.module+'/index.html'
			},
			reloadOnSearch: false,
			resolve: dep
		})
		.when('/:module/:view/:id', {
			templateUrl: function($routeParams){
				return 'modules/'+$routeParams.module+'/index.html'
			},
			reloadOnSearch: false,
			resolve: dep
		})
		.otherwise({
			redirectTo: '/project/main'
		});
	
	let defaults = {
		color: {
			primary:			'blue',
			secondary:			'light-blue',
			customPrimary:		{},
			customSecondary:	{}
		}
	}
	
	config.color = {...defaults.color, ...config.color};
	config = {...defaults, ...config};
	

	var customPrimary = $mdThemingProvider.extendPalette(config.color.primary, config.color.customPrimary);
	var customSecondary = $mdThemingProvider.extendPalette(config.color.secondary, config.color.customSecondary);
	
	$mdThemingProvider.definePalette('customPrimary', customPrimary);
	$mdThemingProvider.definePalette('customSecondary', customSecondary);

	$mdThemingProvider.theme('default')
		.primaryPalette('customPrimary')
		.accentPalette('customSecondary');
})

app.controller('SiteCtrl', function SiteCtrl($rootScope, $firebaseAuth, $firebaseObject, $routeParams, $sce, $http, $mdDialog, $mdMedia, $mdSidenav, $mdToast, $q, config, Auth, Fire){
	$rootScope.config = config;
	$rootScope.params = $routeParams;
	$rootScope.$mdMedia = $mdMedia;
	$rootScope.$mdToast = $mdToast;
	$rootScope.auth = $firebaseAuth();

	
	if(config.fire)
		Fire.config(config.fire);
	
	Auth.init($rootScope, (user)=>{
		tools.profile.init(user);
	})
	// $firebaseAuth().$onAuthStateChanged(function(user) {
	// 	if(user){
	// 		$rootScope.user = user;
	// 		tools.profile.init(user);
	// 		// tools.profile.gapi(user);
	// 	}
	// });
	
	$rootScope.loginMethods = [{
		title: 	'Google',
		icon: 	'google',
		provider: new firebase.auth.GoogleAuthProvider()
	}, {
		title: 	'Microsoft',
		icon: 	'windows',
		provider: new firebase.auth.OAuthProvider('microsoft.com')
	}, {
		title: 	'Github',
		icon: 	'github',
		provider: new firebase.auth.GithubAuthProvider()
	}, {
		title: 	'Facebook',
		icon: 	'facebook',
		provider: new firebase.auth.FacebookAuthProvider()
	}, {
		title: 	'Email',
		icon: 	'envelope',
		type: 	'email',
		fn: 	()=>{
			let login = $rootScope.loginMethod;
			firebase.auth().sendSignInLinkToEmail(login.email, {
				url: window.location.href,
				handleCodeInApp: true
			}).then(()=>{
				login.status == 'sent';
				window.localStorage.setItem('emailForSignIn', login.email);
				tools.alert('Email Sent - Check your email for a link.  It may take a few minutes to arrive.');
			}).catch((error)=>{
				console.error(error);
				tools.alert('Error logging in.');
				delete $rootScope.login;
			});
		}
	}]

	$rootScope.$on('$routeChangeStart', ($event, next, current)=>{
		Auth.reset();
	});
	$rootScope.$on('$routeChangeSuccess', ($event, cur, pre)=>{
		if($rootScope.$device && $rootScope.profile){
			$rootScope.profile.$fire.update({
				'stats.page': 				window.location.href,
				'stats.currentDevice': 		$rootScope.$device.id,
				'stats.updatedOn': 			new Date()
			});
			
			if($rootScope.session){
				let session = 		$rootScope.session;
				session.page = 		window.location.href;
				session.deviceId = 	$rootScope.$device.id;
				session.$fire.save();
			}
		}
	});

	var tools = $rootScope.rootTools = $rootScope.tools = {
		init: function(){
			// tools.errors();
			tools.loginCheck();
		},
		component: function(name){
			return 'component/'+name+'.html'
		},
		loginCheck: ()=>{
			if(firebase.auth().isSignInWithEmailLink(window.location.href)){
				var email = window.localStorage.getItem('emailForSignIn');
				if(!email)
					email = window.prompt('Please provide your email for confirmation');

				firebase.auth().signInWithEmailLink(email, window.location.href)
				.then(function(result){
					window.localStorage.removeItem('emailForSignIn');
				}).catch(function(error){
					
				});
			}
		},
		login: function(method){
			$rootScope.loginMethods = $rootScope.loginMethods.filter(m=>{
				if($rootScope.config.login)
					return $rootScope.config.login.indexOf(m.title) != -1;
				else
					return true;
			})

			if(method){
				if(method.provider){
					let provider = method.provider || $rootScope.loginMethods[0].provider;
					$firebaseAuth().$signInWithPopup(provider);
					$mdDialog.hide();
				}else{
					$rootScope.loginMethod = method;
					$rootScope.loginMethod.clear = ()=>{
						delete $rootScope.loginMethod;
					}
				}
			}else if($rootScope.loginMethods.length == 1){
				tools.login($rootScope.loginMethods[0])
			}else{
				tools.dialog('login');
			}
		},
		logout: function(){
			firebase.auth().signOut().then(function() {
				localStorage.clear();
				window.location.reload();
			}, function(error) {
			// An error happened.
			});
		},
		profile: {
			init: function(user){
				console.log({a:'setup profile', user})
				if(window.gtag)
					gtag('set', {user_id: user.uid});
				if(pathValue($rootScope, 'profile.id') != user.uid){
					$rootScope.profile = {status:'pending'}
					new Fire(`profile/${user.uid}`).get().then(profile=>{
						$rootScope.profile = profile;
						tools.profile.sync(profile, [{
							title: 	'Display Name',
							path: 	'displayName'
						}, {
							title: 	'Email',
							path: 	'email'
						}]);
						tools.device.init(profile);
					})
				}
			},
			// gapi: function(user){
			// 	gapi.load('client', function(){
			// 		gapi.client.init({
			// 			apiKey: 	config.firebase.apiKey,
			// 			clientId:	config.clientId
			// 		}).then(function(r){
			// 			gapi.auth.authorize({
			// 				'client_id': config.clientId,
			// 				'scope': ['profile'],
			// 				'immediate': true
			// 			});
			// 		})
			// 	});
			// },
			contactChoice: (choice)=>{
				if(choice == 'PUSH')
					tools.device.register();
			},
			sync: (profile)=>{
				let defaultImg = 'https://res.cloudinary.com/ldsplus/image/upload/v1576258469/pixel/blank-profile-picture-973460_640.png';
				let version = 1.03;
				if(!profile.version || profile.version < version){ //first time and if we update the version we will run this to re-calculate the values...
					profile.version = version;
					profile.displayName = profile.displayName || $rootScope.user.displayName || ' ';
					profile.firstName 	= profile.firstName || profile.displayName.split(' ')[0];
					profile.lastName 	= profile.lastName || profile.displayName.replace(profile.firstName, '');
					profile.authEmail 	= $rootScope.user.email;
					profile.email 		= profile.email || $rootScope.user.email;
					profile.createdOn 	= profile.createdOn || new Date();
					profile.updatedOn	= new Date();
					if(!profile.img || profile.img.indexOf('cloudinary') == -1){
						if($rootScope.user.photoURL){
							let imgUrl = $rootScope.user.photoURL;
							$http.post('/cloud/cl_img', {imgUrl}).then(result=>{
								profile.img = result.data.secure_url || defaultImg;
								profile.picture = profile.picture || {
									img_url: 		profile.img,
									secure_url: 	profile.img
								}
								profile.$fire.save();
							})
						}else{
							profile.img = defaultImg;
						}
					}else{
						profile.$fire.save()
					}
				}
			}
		},

		device: {
			initDefer: $q.defer(),
			init: (profile)=>{
				tools.device.get(profile).then(device=>{
					if(profile.version)
						profile.$fire.update({
							'stats.page': 				window.location.href,
							'stats.currentDevice': 		$rootScope.$device.id
						});

					new Fire(`profile/${profile.id}/stats`).add({
						page: 		window.location.href,
						deviceId: 	device.id,
						type: 		'New Page',
						time: 		0,
						hasFocus: 	document.hasFocus(),
						updatedOn: 	new Date()
					}).then(session=>{
						$rootScope.session = session;
						document.addEventListener("visibilitychange", c=>{
							let updatedOn 	= new Date();
							let time 		= session.time;
							let hasFocus 	= document.hasFocus();
							if(hasFocus){
								time += moment(updatedOn).diff(moment(session.updatedOn));
								session.$fire.update({updatedOn, time, hasFocus});
							}
						});
					});
					const messaging = $rootScope.messaging = firebase.messaging();
					let origin = window.location.origin;
					navigator.serviceWorker.register(`${origin}/component/firebase-sw.js`)
					.then(registration=>{
						messaging.useServiceWorker(registration);
						if(window.Notification.permission == "granted")
							tools.device.messaging();
						tools.device.initDefer.resolve();
					}).catch(e=>{
						console.log(e);
					})

					if(window.Notification.permission == "granted"){
						tools.device.messaging();
					}
				})
			},
			list: ()=>{
				return new Fire(`profile/${$rootScope.user.uid}/devices`).get().then(devices=>{
					$rootScope.myDevices = devices;
					let did = pathValue($rootScope, '$device.id');
					$rootScope.$device = devices.find(d=>d.id == did); //this was already declared, but we will switch to this one for better sync.
					return devices;
				});
			},
			get: (profile)=>{
				return new Promise((res,rej)=>{
					let version = 1.1;
					var device = JSON.parse(localStorage.getItem('device') || '{}');
					if(!device.id || device.version < version){
						presence.device.init().then(device=>{
							device.version 		= version;
							new Fire(`profile/${profile.id}/devices`).add(device).then(newDevice=>{
								device.id = newDevice.id;
								localStorage.setItem('device', JSON.stringify(device));
								$rootScope.$device = newDevice;
								res(newDevice);
							});
						});
					}else{
						new Fire(`profile/${profile.id}/devices/${device.id}`).get().then($device=>{
							$rootScope.$device = $device;
							if($device.version < version){
								presence.device.init().then(device=>{
									device.version 	= version;
									device.id 		= $device.id;
									$device.$fire.update(device);
									res($device);
								});
							}
							res($device);
						});
					}
				});
			},
			toggle: ()=>{
				if($rootScope.$device.subscribe == undefined){
					tools.device.register();
				}else{
					let type = pathValue($rootScope, '$device.browserStats.browser.name') || 'Unknown';
					$rootScope.$device.title = $rootScope.$device.title || prompt('You can name this device to receive notifications.') || `My ${type} Device`;
					$rootScope.$device.$fire.save();
				}
			},
			register: ()=>{
				let type = pathValue($rootScope, '$device.browserStats.browser.name') || 'Unknown';
				$rootScope.$device.title 		= $rootScope.$device.title || prompt('You can name this device to receive notifications.') || `My ${type} Device`;
				$rootScope.$device.subscribe 	= true;
				$rootScope.messaging.requestPermission()
				.then(()=>{
					tools.device.messaging();
				})
				.catch(function(err){
					delete $rootScope.$device.status.token;
					$rootScope.$device.status = 'No Permission';
					$rootScope.$device.$fire.save();
				});
			},
			messaging: ()=>{
				tools.device.syncToken();
				$rootScope.messaging.onMessage((payload)=>{
					it.lastMessage = payload;
					$rootScope.lastMessage = payload;
					$mdToast.show({
						template: `
							<md-toast>
								<md-button class="md-icon-button" ng-click="$mdToast.hide()">
									<i class="fa fa-close"></i>
								</md-button>
								<a ng-href="${payload.notification.click_action}" ng-click="$mdToast.hide()" flex>${payload.notification.body}</a>
							</md-toast>
						`,
						scope: $rootScope,
						preserveScope: true,
						position: 'bottom left',
						hideDelay: 0
					})
				});
				$rootScope.messaging.onTokenRefresh(tools.device.syncToken);
			},
			syncToken: ()=>{
				tools.device.initDefer.promise.then(r=>{
					$rootScope.messaging.getToken().then(token=>{
						if(token){
							if(token != $rootScope.$device.token){
								delete $rootScope.$device.error;
								$rootScope.$device.token = token;
								$rootScope.$device.status = 'Registered';
								$rootScope.$device.$fire.save()
							}
						}else{
							$rootScope.$device.status = 'Unregistered';
							$rootScope.$device.$fire.save()
						}
					})
					.catch(function(err){
						let newStatus = 'Token Error';
						if($rootScope.$device.status != newStatus){
							$rootScope.$device.status = newStatus;
							$rootScope.$device.error = err.message;
							$rootScope.$device.$fire.save()
						}
					});
				})
			}
		},
		
		alert: function(message){
			$mdToast.show(
			$mdToast.simple()
				.textContent(message)
				.hideDelay(5000)
			);
		},
		dialog: function(dialog, params){
			if(dialog.indexOf('http') != -1)
				dialog = $sce.trustAsResourceUrl(dialog);
			else
				dialog = tools.component(dialog);
			params = Object.assign({
				scope: $rootScope,
				preserveScope: true,
				templateUrl: dialog,
				multiple: true,
				parent: angular.element(document.body),
				clickOutsideToClose: true
			}, params)
			return $mdDialog.show(params)
		},
		sidebar: function(action){
			if(action)
				if(action == 'open')
					$mdSidenav('left').open()
				else
					$mdSidenav('left').close()
			else
				$mdSidenav('left').toggle()
		},
		feedback: function(event){
			$mdDialog.show({
				controller: 'FeedbackCtrl',
				templateUrl: tools.component('feedback'),
				parent: angular.element(document.body),
				targetEvent: event,
				clickOutsideToClose: true
			})
		},
		errors: ()=>{
			window.onerror = function(message,source,lineno,colno,error) {
				$http.post('cloud/log', {
					url:		window.location.href,
					createdOn:	new Date().toISOString(),
					deviceId:	localStorage.deviceId || '',
					name:		'Window Error',
					message:	message,
					source: 	source,
					stack:		error && error.stack || '',
					line:		lineno,
					col:		colno,
					env:		{
						browser:	navigator.appName,
						agent:		navigator.userAgent,
						version:	navigator.appVersion
					}
				})
				return true;
			};
			console.error = function(error){
				$http.post('cloud/log', {
					url:		window.location.href,
					createdOn:	new Date().toISOString(),
					deviceId:	localStorage.deviceId || '',
					name:		'Console Error',
					error:		error,
					stack:		error & error.stack || null,
					env:		{
						browser:	navigator.appName,
						agent:		navigator.userAgent,
						version:	navigator.appVersion
					}
				})
			}
		}
	}
	tools.init();

	it.SiteCtrl = $rootScope;
});


app.controller('FeedbackCtrl', function FeedbackCtrl($rootScope, $scope, $mdDialog, $mdToast, $firebaseArray){
	var feedbackRef = firebase.database().ref().child("feedback");

	$scope.send = function(){
		feedbackRef.push({
			user: {
				uid:	$rootScope.user.uid,
				email:	$rootScope.user.email,
				name:	$rootScope.user.displayName
			},
			location:	window.location.href,
			message:	$scope.feedback
		}).then(function(r){
			$mdToast.show($mdToast.simple().textContent('Thanks!'))
			$mdDialog.hide(r);
		}, function(e){
			$mdDialog.cancel(e);
		})
	}
})
app.controller('StripeCtrl', function StripeCtrl($scope, $mdDialog, Auth, $firebaseObject, $http, cart, view){
	$scope.status = 'Ready';
	$scope.cart = cart;
	$scope.view = view;
	$scope.error = {};
	$scope.card = {metadata:{}};
	
	$scope.tools = {
		init: function(){
			Auth().then(function(user){
				$scope.user = user;
				var customerRef = firebase.database().ref().child('stripe/customers').child(user.uid);
				$scope.customer = $firebaseObject(customerRef);
				// $scope.customer.$loaded().then(function(){
				// 	if($scope.customer.sources)
				// 		$scope.methods = $scope.customer.sources.data;
				// 	else //If there is no record for this user....
				// 		$scope.view = 'manage';
				// })
			}).catch(e=>{
				console.log('User not logged in.')
			})
		},
		checkout: {
			pay: function(card){
				$scope.status = 'Processing';
				var postUrl = cart.url || '/stripe/checkout';
				firebase.auth().currentUser.getIdToken(true).then(function(jwt){
					$http.post(postUrl, {jwt:jwt, params:{
						amount: 		cart.amount * 100,
						currency:		'usd',
						customer:		$scope.customer.id,
						source: 		card,
						description:	cart.description,
						interval:		cart.interval,
						interval_count: cart.interval_count
					}}).then(function(r){
						$mdDialog.hide(r);
					}, function(e){
						$scope.error = e;
					})
				})
			}
		},
		manage: {
			add: function(){
				$scope.view = 'manage';
			},
			save: function(){
				//validate information
				var card = angular.copy($scope.card)
					card.exp_month = Number(card.exp.split('/')[0])
					card.exp_year = Number(card.exp.split('/')[1])
				function validate(card){
					var valid = true;
					if(!Stripe.validateCardNumber(card.number)){
						valid = false;
						$scope.error.number = 'The cc number you entered is not valid.'
					}
					if(!Stripe.validateExpiry(card.exp_month, card.exp_year)){
						valid = false;
						$scope.error.number = 'The expiration you entered is not valid.'
					}
					if(!Stripe.validateCVC(card.cvc)){
						valid = false;
						$scope.error.number = 'The cvc you entered is not valid.'
					}
					return valid;
				}
					
				if(validate(card)){
					card.metadata.user = $scope.user.uid;
					Stripe.card.createToken(card, function(status, obj){
						$scope.newCard = obj;
						firebase.auth().currentUser.getIdToken(true).then(function(jwt){
							$http.post('/stripe/customer', {jwt:jwt, params:{
								action: 		'add',
								customer:		$scope.customer.id,
								name:			$scope.user.displayName,
								email:			$scope.user.email,
								source: 		obj.id,
								title:			card.title
							}}).then(function(r){
								if($scope.cart){
									$scope.view = 'checkout';
								}else{
									$mdDialog.hide(r);
								}
							}, function(e){
								$scope.error.manage = e;
							})
						})
					})
				}
			},
			cancel: function(){
				$scope.view = 'checkout';
			}
		}
	}
	$scope.tools.init();
	it.StripeCtrl = $scope;
})



var whoisConfig = {
    apiKey: "AIzaSyD_3nGYh1GA2Ucds20nm8ad8HsuHFXRxbg",
    authDomain: "atfiliate.firebaseapp.com",
    databaseURL: "https://atfiliate.firebaseio.com",
    projectId: "atfiliate",
    storageBucket: "atfiliate.appspot.com",
    messagingSenderId: "126442541687",
    appId: "1:126442541687:web:1819721adcc2b9fe24ec72"
}
var whois = firebase.initializeApp(whoisConfig, "whois");

angular.element(function() {
	angular.bootstrap(document, ['app']);
});






