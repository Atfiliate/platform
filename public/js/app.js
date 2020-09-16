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

	let imports = ['ngMaterial','firebase','ngRoute','chart.js'];
	if(window.Raven)
		imports.push('ngRaven')
var app = angular.module('app', imports);
app.config(function($routeProvider, $locationProvider, $controllerProvider, $provide, $compileProvider, $mdThemingProvider, $injector) {
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
			redirectTo: '/page/main'
		});
	
	var config = localStorage.getItem('whois') || '{}';
	config = JSON.parse(config);
	config.color = config.color || {};
	config.color.primary = config.color.primary || 'blue';
	config.color.secondary = config.color.secondary || 'light-green';
	config.color.customPrimary = config.color.customPrimary || {};
	config.color.customSecondary = config.color.customSecondary || {};

	var customPrimary = $mdThemingProvider.extendPalette(config.color.primary, config.color.customPrimary);
	var customSecondary = $mdThemingProvider.extendPalette(config.color.secondary, config.color.customSecondary);
	
	$mdThemingProvider.definePalette('customPrimary', customPrimary);
	$mdThemingProvider.definePalette('customSecondary', customSecondary);

	$mdThemingProvider.theme('default')
		.primaryPalette('customPrimary')
		.accentPalette('customSecondary');
})

app.controller('SiteCtrl', function SiteCtrl($rootScope, $firebaseAuth, $firebaseObject, $routeParams, $sce, $http, $mdDialog, $mdMedia, $mdSidenav, $mdToast, $q, config, Fire){
	$rootScope.params = $routeParams;
	$rootScope.$mdMedia = $mdMedia;
	$rootScope.$mdToast = $mdToast;
	$rootScope.auth = $firebaseAuth();

	
	if(config.fire)
		Fire.config(config.fire);
	$firebaseAuth().$onAuthStateChanged(function(user) {
		if(user){
			$rootScope.user = user;
			tools.profile.init(user);
			// tools.profile.gapi(user);
		}
	});
	var siteRef = firebase.database().ref().child("site/public/settings");
	$rootScope.site = $firebaseObject(siteRef);
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

	$scope.$on('$routeChangeStart', ($event, next, current)=>{
		console.log({$event, current, next});
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
				if($rootScope.site.login)
					return $rootScope.site.login.indexOf(m.title) != -1;
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
				if(window.gtag)
					gtag('set', {user_id: user.uid});
				if(!$rootScope.profile){
					$rootScope.profile = {status:'pending'}
					new Fire(`profile/${user.uid}`).get().then(profile=>{
						$rootScope.profile = profile;
						tools.profile.setup(profile);
						tools.device.init();
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
			setup: profile=>{
				var Tawk_API = window.Tawk_API || {};
				Tawk_API.onLoad = function(){
					Tawk_API.setAttributes({
						name: 	profile.displayName,
						email: 	profile.email
					}, function(error){});
				}

				let defaultImg = 'https://res.cloudinary.com/ldsplus/image/upload/v1576258469/pixel/blank-profile-picture-973460_640.png';
				let version = 1.03;
				
				profile.$save = (closeDialog)=>{
					profile = organize(profile);
					profile.$fire.save();
					new Fire.legacy(`profile`).set(profile);
					if(closeDialog)
						$mdDialog.hide();
				}
				profile.$dialog = (reqAttrs = [])=>{
					$rootScope.profileNeeds = reqAttrs;
					tools.dialog('https://a.alphabetize.us/project/code/cloud/code?gid=iZTQIVnPzPW7b2CzNUmO&pid=WAEzasxjWZSggmwP3MER&cid=profile.dialog')
				}
				
				let organize = profile=>{
					profile.version = version;
					profile.displayName = profile.displayName || $rootScope.user.displayName || ' ';
					profile.firstName 	= profile.firstName || profile.displayName.split(' ')[0];
					profile.lastName 	= profile.lastName || profile.displayName.split(' ')[1];
					profile.authEmail 	= $rootScope.user.email;
					profile.email 		= profile.email || $rootScope.user.email;
					profile.createdOn 	= profile.createdOn || new Date();
					profile.updatedOn	= new Date();
					return profile;
				}

				if(!profile.version || profile.version < version){
					profile = organize(profile);

					let reqAttrs = [];
					if(profile.displayName == ' ')
						reqAttrs.push('displayName');
					if(!profile.email)
						reqAttrs.push('email');
					if(reqAttrs.length)
						profile.$dialog(reqAttrs)

					if(!profile.img || profile.img.indexOf('cloudinary') == -1){
						if($rootScope.user.photoURL){
							let imgUrl = $rootScope.user.photoURL;
							$http.post('/cloud/cl_img', {imgUrl}).then(result=>{
								profile.img = result.data.secure_url || defaultImg;
								profile.$save();
							})
						}else{
							profile.img = defaultImg;
						}
					}else{
						profile.$save()
					}
				}
			}
		},

		device: {
			initDefer: $q.defer(),
			init: ()=>{
				const messaging = $rootScope.messaging = firebase.messaging();
				let origin = window.location.origin;
				navigator.serviceWorker.register(`${origin}/component/firebase-sw.js`)
				.then(registration=>{
					messaging.useServiceWorker(registration);
					if(window.Notification.permission == "granted")
						tools.device.messaging();
					$rootScope.device = tools.device.get();
					tools.device.initDefer.resolve();
				}).catch(e=>{
					$rootScope.device = tools.device.get();
				})

				if(window.Notification.permission == "granted"){
					tools.device.messaging();
				}else{
					$rootScope.device = tools.device.get();
				}
			},
			get: ()=>{
				var deviceId = localStorage.getItem('deviceId');
				if(!deviceId){
					deviceId = chance.md5();
					localStorage.setItem('deviceId', deviceId);
				}
				$rootScope.profile.devices = $rootScope.profile.devices || [];
				let device = $rootScope.profile.devices.find(d=>d.id==deviceId);
				if(!device){
					device = {
						id: deviceId,
						createdOn: new Date()
					}
					$rootScope.profile.devices.push(device);
					$rootScope.profile.$fire.save();
				}
				return device;
			},
			type: ()=>{
				if(navigator.userAgent.match(/Android/i))
					return 'Android'
				else if(navigator.userAgent.match(/BlackBerry/i))
					return 'BlackBerry'
				else if(navigator.userAgent.match(/iPhone|iPad|iPod/i))
					return 'iOS'
				else if(navigator.userAgent.match(/Opera Mini/i))
					return 'Opera'
				else if(navigator.userAgent.match(/IEMobile/i))
					return 'Windows'
				else if(navigator.userAgent.match(/Windows/i))
					return 'Windows'
				else
					return 'Unknown'
			},
			register: ()=>{
				return new Promise((resolve)=>{
					$rootScope.device.type = tools.device.type();
					$rootScope.device.title = $rootScope.device.title || prompt('You can name this device to receive notifications.') || `My ${$rootScope.device.type} Device`;
					$rootScope.device.subscribe = true;
					
					$rootScope.messaging.requestPermission()
					.then(()=>{
						tools.device.messaging(resolve);
					})
					.catch(function(err){
						$rootScope.device.status = 'No Permission';
						$rootScope.profile.$fire.save()
					});
				})
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
			syncToken: (resolve)=>{
				tools.device.initDefer.promise.then(r=>{
					$rootScope.messaging.getToken().then(token=>{
						if(token){
							if(token != $rootScope.device.token){
								delete $rootScope.device.error;
								$rootScope.device.token = token;
								$rootScope.device.status = 'Registered';
								$rootScope.profile.$fire.save()
								if(resolve)
									resolve('Device Registered');
							}
						}else{
							$rootScope.device.status = 'Unregistered';
							$rootScope.profile.$fire.save()
						}
					})
					.catch(function(err){
						let newStatus = 'Token Error';
						if($rootScope.device.status != newStatus){
							$rootScope.device.status = newStatus;
							$rootScope.device.error = err.message;
							$rootScope.profile.$fire.save()
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
		// errors: ()=>{
		// 	window.onerror = function(message,source,lineno,colno,error) {
		// 		$http.post('cloud/log', {
		// 			url:		window.location.href,
		// 			createdOn:	new Date().toISOString(),
		// 			user:		it.uid || null,
		// 			name:		'Window Error',
		// 			message:	message,
		// 			source: 	source,
		// 			stack:		error && error.stack || '',
		// 			line:		lineno,
		// 			col:		colno,
		// 			env:		{
		// 				browser:	navigator.appName,
		// 				agent:		navigator.userAgent,
		// 				version:	navigator.appVersion
		// 			}
		// 		})
		// 		return true;
		// 	};
		// 	console.error = function(error){
		// 		$http.post('cloud/log', {
		// 			url:		window.location.href,
		// 			createdOn:	new Date().toISOString(),
		// 			user:		it.uid || null,
		// 			name:		'Console Error',
		// 			error:		error,
		// 			stack:		error & error.stack || null,
		// 			env:		{
		// 				browser:	navigator.appName,
		// 				agent:		navigator.userAgent,
		// 				version:	navigator.appVersion
		// 			}
		// 		})
		// 	}
		// }
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
var site = window.location.origin.replace('https://', '').replace('http://', '').split('.').join('*');
whois.database().ref('whois/public').child(site).once('value', snap=>{
	whois.config = snap.val();
	localStorage.setItem('whois', JSON.stringify(whois.config));
	angular.element(function() {
		angular.bootstrap(document, ['app']);
	});
})