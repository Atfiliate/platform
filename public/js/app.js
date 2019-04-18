/*
	global app, angular, firebase, gapi, $script, localStorage, navigator
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


var app = angular.module('app', ['ngMaterial','firebase','ngRoute','chart.js','pascalprecht.translate']);
app.config(function($routeProvider, $locationProvider, $controllerProvider, $provide, $compileProvider, $mdThemingProvider, $translateProvider) {
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|file|data|sms|tel):/);
	$locationProvider.hashPrefix('');
	app.lazy = {
		controller: $controllerProvider.register,
		factory: 	$provide.factory,
		service: 	$provide.service,
		theme:		$mdThemingProvider,
		compile:	$compileProvider
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
	
	var config = localStorage.getItem('whois');
	config = JSON.parse(config);
	config.color = config.color || {};
	config.color.primary = config.color.primary || 'blue';
	config.color.secondary = config.color.secondary || 'light-green';
	$mdThemingProvider.theme('default')
		.primaryPalette(config.color.primary)
		.accentPalette(config.color.secondary);
	$translateProvider.useStaticFilesLoader({
		prefix: 'language/',
		suffix: '.json'
	});
	$translateProvider.preferredLanguage('en');
	
	if(!config.debug){
		$provide.decorator("$exceptionHandler", ['$delegate', '$injector',function ($delegate, $injector) {
			return function(exception, cause) {
				if(typeof exception == 'string')
					exception = {message: exception}
				var $http = $injector.get("$http");
				$http.post('cloud/log', {
					url:		window.location.href,
					createdOn:	new Date().toISOString(),
					user:		it.uid || null,
					name:		'Angular Exception',
					message:	exception.message, 
					stack:		exception.stack,
					file:		exception.fileName,
					line:		exception.lineNumber,
					cause:		cause,
					env:		{
						browser:	navigator.appName,
						agent:		navigator.userAgent,
						version:	navigator.appVersion
					}
				})
				console.error(exception);
			}
		}]);
		widnow.onerror = function(message,source,lineno,colno,error) {
			var $http = $injector.get("$http");
			$http.post('cloud/log', {
				url:		window.location.href,
				createdOn:	new Date().toISOString(),
				user:		it.uid || null,
				name:		'Console Error',
				message:	message, 
				stack:		source,
				line:		lineno,
				col:		colno,
				error:		error,
				env:		{
					browser:	navigator.appName,
					agent:		navigator.userAgent,
					version:	navigator.appVersion
				}
			})
			console.warn(exception);
		};
	}
})

app.controller('SiteCtrl', function SiteCtrl($rootScope, $firebaseAuth, $firebaseObject, $routeParams, $http, $translate, $mdToast, $mdDialog, $mdMedia, $mdSidenav, config){
	if(config.mixpanel)
		mixpanel.init(config.mixpanel);
	// if(window.location.origin != config.origin)
	// 	window.location = config.origin+'/'+window.location.hash;
	$rootScope.params = $routeParams;
	$rootScope.$mdMedia = $mdMedia;
	$rootScope.auth = $firebaseAuth();
	$firebaseAuth().$onAuthStateChanged(function(user) {
		if(user){
			$rootScope.user = user;
			tools.profile.init(user);
			tools.profile.gapi(user);
		}
	});
	var siteRef = firebase.database().ref().child("site/public/settings");
	$rootScope.site = $firebaseObject(siteRef);
	
	var tools = $rootScope.rootTools = $rootScope.tools = {
		init: function(){},
		component: function(name){
			return 'component/'+name+'.html'
		},
		login: function(method){
			$firebaseAuth().$signInWithPopup("google");
			//open dialog to allow user to choose?
			//use chosen method.
			//do we allow in admin settings the ability to choose which login methods will be shown?
			//when a user is logging in with an email link we need to use the current url as redirect-back
			//send signin link
			//notify them to check their email
			//when redirect back we need to handle final auth process.
		},
		profile: {
			init: function(user){
				it.uid = user.uid || null;
				if(config.mixpanel)
					mixpanel.identify(user.uid);
				var profileRef = firebase.database().ref().child("account/public").child(user.uid);
				$rootScope.profile = $firebaseObject(profileRef);
				$rootScope.profile.$loaded(function(profile) {
					if(!profile.displayName)
						tools.profile.setup();
				}, function(e){
					console.log('no profile')
				})
			},
			gapi: function(user){
				gapi.load('client', function(){
					gapi.client.init({
						apiKey: 	config.firebase.apiKey,
						clientId:	config.clientId
					}).then(function(r){
						gapi.auth.authorize({
							'client_id': config.clientId,
							'scope': ['profile'],
							'immediate': true
						});
					})
				});
			},
			setup: function(){
				if($rootScope.user){
					//needed to improve people search.
					if(!$rootScope.user.displayName)
						$rootScope.user.displayName = 'Unknown User';
					$rootScope.profile.displayName = $rootScope.user.displayName.toLowerCase();
					$rootScope.profile.photoURL = $rootScope.user.photoURL;
					$rootScope.profile.createdOn = new Date().toISOString();
					$rootScope.profile.$save()
					
					if(config.mixpanel){
						var names = $rootScope.user.displayName.split(' ')
						mixpanel.people.set({
							"$first_name": names[0],
							"$last_name": names.splice(1).join(' '),
							"$created": moment().toISOString(),
							"$email": $rootScope.user.email
						});
					}
					
					var accountRef = firebase.database().ref().child("account/private").child($rootScope.user.uid);
					var account = $firebaseObject(accountRef);
					account.$loaded(function(){
						account.displayName = $rootScope.user.displayName;
						account.email = $rootScope.user.email;
						account.$save();
					})
				}
			}
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
			})
		},
		checkout: {
			pay: function(card){
				var postUrl = cart.url || '/stripe/checkout';
				firebase.auth().currentUser.getToken(true).then(function(jwt) {
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
						firebase.auth().currentUser.getToken(true).then(function(jwt) {
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
	messagingSenderId: "126442541687"
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