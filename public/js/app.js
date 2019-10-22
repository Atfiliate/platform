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


var app = angular.module('app', ['ngMaterial','firebase','ngRoute','chart.js']);
app.config(function($routeProvider, $locationProvider, $controllerProvider, $provide, $compileProvider, $mdThemingProvider) {
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

app.controller('SiteCtrl', function SiteCtrl($rootScope, $firebaseAuth, $firebaseObject, $routeParams, $http, $mdDialog, $mdMedia, $mdSidenav, config, Fire){
	$rootScope.params = $routeParams;
	$rootScope.$mdMedia = $mdMedia;
	$rootScope.auth = $firebaseAuth();

	if(config.fire)
		Fire.config(config.fire);
	$firebaseAuth().$onAuthStateChanged(function(user) {
		if(user){
			$rootScope.user = user;
			tools.profile.init(user);
			tools.profile.gapi(user);
		}
	});
	var siteRef = firebase.database().ref().child("site/public/settings");
	$rootScope.site = $firebaseObject(siteRef);
	$rootScope.loginMethods = [{
		title: 	'Google',
		ico: 	'google',
		provider: new firebase.auth.GoogleAuthProvider()
	}, {
		title: 	'Microsoft',
		ico: 	'windows',
		provider: new firebase.auth.OAuthProvider('microsoft.com')
	}, {
		title: 	'Github',
		ico: 	'github',
		provider: new firebase.auth.GithubAuthProvider()
	}, {
		title: 	'Facebook',
		ico: 	'facebook',
		provider: new firebase.auth.FacebookAuthProvider()
	}]

	var tools = $rootScope.rootTools = $rootScope.tools = {
		init: function(){
			tools.errors();
		},
		component: function(name){
			return 'component/'+name+'.html'
		},
		login: function(method){
			$rootScope.loginMethods = $rootScope.loginMethods.filter(m=>{
				if($rootScope.site.login)
					return $rootScope.site.login.indexOf(m.title) != -1;
				else
					return true;
			})

			if(method){
				let provider = method.provider || $rootScope.loginMethods[0].provider;
				$firebaseAuth().$signInWithPopup(provider);
				$mdDialog.hide();
			}else if($rootScope.loginMethods.length == 1){
				tools.login($rootScope.loginMethods[0])
			}else{
				tools.dialog('login.html');
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
				it.uid = user.uid || null;
				if(window.gtag)
					gtag('set', {user_id: user.uid});
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
					$rootScope.profile.displayName = $rootScope.user.displayName;
					$rootScope.profile.photoURL = $rootScope.user.photoURL;
					$rootScope.profile.createdOn = new Date().toISOString();
					$rootScope.profile.$save()
					
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

		dialog: function(dialog){
			$mdDialog.show({
				scope: $rootScope,
				preserveScope: true,
				templateUrl: config.origin+'/component/'+dialog,
				multiple: true,
				parent: angular.element(document.body),
				clickOutsideToClose: true
			})
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
					user:		it.uid || null,
					name:		'Window Error',
					message:	message,
					source: 	source,
					stack:		error.stack,
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
					user:		it.uid || null,
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