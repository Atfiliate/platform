/*
	global app, angular, firebase, gapi, $script, localStorage, navigator
	Load even w/out whois.
*/
var it = {
	profilePic: 'https://res.cloudinary.com/ldsplus/image/upload/v1576258469/pixel/blank-profile-picture-973460_640.png'
};
let scope = ()=>{
	return it.ProjCtrl;
}
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


// Loads Stripe.js once without blocking the page. Resolves with window.Stripe.
let _stripeJs;
window.loadStripe = ()=>{
	if(window.Stripe)
		return Promise.resolve(window.Stripe);
	if(_stripeJs)
		return _stripeJs;
	_stripeJs = new Promise((resolve, reject)=>{
		let s = document.querySelector('script[src^="https://js.stripe.com/v3"]');
		if(!s){
			s = document.createElement('script');
			s.src = 'https://js.stripe.com/v3/';
			s.async = true;
			document.head.appendChild(s);
		}
		let fail = ()=>{
			if(window.Stripe)
				return resolve(window.Stripe);
			_stripeJs = null;
			s.remove(); // so the next call retries with a fresh tag
			reject(new Error('Stripe could not load. Please try again.'));
		};
		s.addEventListener('load', ()=>window.Stripe ? resolve(window.Stripe) : fail());
		s.addEventListener('error', fail);
		setTimeout(fail, 20000);
	});
	return _stripeJs;
};

// Time on site. One leader tab per browser (Web Locks) counts active and passive seconds from every tab's state
// (BroadcastChannel) and beacons them to the site's /project/admin/cloud/timeTrack. Active = visible, focused and
// input in the last 2 min, or unmuted media playing. Off with config.timeTrack === false or localStorage.ttOff. Fails silently.
(()=>{
	let L = localStorage, N = ()=>Date.now(), IDLE = 120e3, LIVE = 90e3;
	if(navigator.webdriver || L.ttOff || (window.config || {}).timeTrack === false || !window.BroadcastChannel || !navigator.locks)
		return;
	let url = '/project/admin/cloud/timeTrack', tab = Math.random().toString(36).slice(2);
	let vid = L.ttVid || (L.ttVid = tab + N().toString(36));
	let ch = new BroadcastChannel('timeTrack'), tabs = {}, input = N(), lead = false, last = N(), sent = N(), tok = null, hooked, acc;
	let day = ()=>new Date().toLocaleDateString('en-CA'); // visitor's local day, e.g. 2026-11-12
	let page = ()=>location.pathname.split('/').filter(s=>s && s != 'project' && !/^[\w-]{16,}$/.test(s)).slice(0, 2).join('_').slice(0, 40) || 'home';
	let media = ()=>[...document.querySelectorAll('video,audio')].some(m=>!m.paused && !m.ended && !m.muted);
	let active = ()=>media() || (!document.hidden && document.hasFocus() && N() - input < IDLE);
	let fresh = (n)=>({d: day(), a: 0, s: 0, p: {}, n: n || 0, v: 0});
	let save = ()=>{ acc.t = N(); L.ttAcc = JSON.stringify(acc); };
	let say = (bye)=>{ let m = {tab, a: active(), p: page(), t: N(), bye}; ch.postMessage(m); seen(m); };
	let seen = (m)=>{ lead && accrue(); m.bye ? delete tabs[m.tab] : tabs[m.tab] = m; };
	let accrue = ()=>{ // add the time since the last look: active if any tab is active, else passive if any tab is open
		let t = N(), dt = t - last, live = Object.values(tabs).filter(m=>t - m.t < LIVE), on = live.find(m=>m.a);
		last = t;
		if(acc.d != day())
			send();
		if(dt > LIVE)
			acc.v++; // asleep or closed: count nothing, start a new visit
		else if(on){
			acc.a += dt;
			acc.p[on.p] = (acc.p[on.p] || 0) + dt;
		}else if(live.length)
			acc.s += dt;
		acc.n = Math.max(acc.n, live.length);
		save();
	};
	let send = ()=>{
		let sec = x=>Math.round(x / 1e3), p = {};
		if(acc.a + acc.s >= 1e3){
			for(let k in acc.p)
				p[k] = sec(acc.p[k]);
			let body = JSON.stringify({vid, d: acc.d, a: sec(acc.a), s: sec(acc.s), n: acc.n, v: acc.v, p, tok, link: L.ttLink ? 1 : 0});
			try{
				navigator.sendBeacon ? navigator.sendBeacon(url, new Blob([body], {type: 'application/json'}))
					: fetch(url, {method: 'POST', body, keepalive: true, headers: {'Content-Type': 'application/json'}}).catch(e=>{});
			}catch(e){}
			delete L.ttLink;
		}
		sent = N();
		acc = fresh(acc.d == day() ? acc.n : 0);
		save();
	};
	let flush = (force)=>{ // 5 min while active, 15 min passive only, and at once on hide or close
		if(!lead)
			return;
		accrue();
		if(acc.a + acc.s >= 5e3 && (force || N() - sent > (acc.a ? 300e3 : 900e3)))
			send();
	};
	let hook = ()=>{ // the signed-in user's ID token rides along so the server can trust the uid
		let f = window.firebase;
		if(hooked || !f || !f.apps || !f.apps.some(a=>a.name == '[DEFAULT]'))
			return;
		hooked = 1;
		f.auth().onIdTokenChanged(u=>{
			if(!u)
				return tok = null;
			u.getIdToken().then(t=>{
				tok = t;
				if(L.ttUid != u.uid){ L.ttUid = u.uid; L.ttLink = 1; } // first login here: server links this browser's anonymous days
			}).catch(e=>{});
		});
	};
	['pointerdown', 'keydown', 'wheel', 'touchstart', 'mousemove'].forEach(e=>addEventListener(e, ()=>{
		let idle = N() - input > IDLE;
		input = N();
		idle && say();
	}, {passive: true, capture: true}));
	['focus', 'blur'].forEach(e=>addEventListener(e, ()=>say()));
	['play', 'pause', 'ended'].forEach(e=>document.addEventListener(e, ()=>say(), true));
	document.addEventListener('visibilitychange', ()=>{ say(); document.hidden && flush(1); });
	addEventListener('pagehide', ()=>{ say(1); flush(1); });
	ch.onmessage = e=>seen(e.data);
	say();
	setInterval(()=>{ hook(); say(); flush(); }, 15e3);
	navigator.locks.request('timeTrack', ()=>new Promise(()=>{ // held until this tab closes, then the next tab leads
		try{ acc = JSON.parse(L.ttAcc); }catch(e){}
		acc = acc && acc.d ? acc : fresh();
		if(N() - (acc.t || 0) > LIVE)
			acc.v++;
		last = N();
		lead = true;
	})).catch(e=>{});
})();

if(window.location.protocol == 'http:')
	window.location = window.location.href.replace('http:', 'https:')
	
if(window.location.hash.indexOf('#/project/') === 0){
	let route = window.location.hash.substring('#/project'.length);

	window.history.replaceState(
		null,
		'',
		route + window.location.search
	);
}

let imports = ['ngMaterial','firebase','ngRoute','ngSanitize','chart.js'];
if(window.Raven)
	imports.push('ngRaven')
	
var app = angular.module('app', imports);
app.config(function($routeProvider, $locationProvider, $controllerProvider, $provide, $compileProvider, $mdThemingProvider, $injector, $sanitizeProvider) {
	$compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|mailto|file|data|sms|tel):/);
	$locationProvider.html5Mode({
		enabled: true,
		requireBase: true,
		rewriteLinks: true
	});
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
			// var module = window.location.hash.split('/')[1];
			var dependencies = [
				`/core/project-ctrl.js`
			];
			$script(dependencies, function() {
				deferred.resolve();
			});
			return deferred.promise;
		}
	}
	$routeProvider
		.when('/:view', {
			templateUrl: 'modules/project/index.html',
			reloadOnSearch: false,
			resolve: dep
		})
		.when('/:view/:id', {
			templateUrl: 'modules/project/index.html',
			reloadOnSearch: false,
			resolve: dep
		})
		.otherwise({
			redirectTo: '/main'
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


app.controller('SiteCtrl', function SiteCtrl($rootScope, $firebaseAuth, $firebaseObject, $routeParams, $sce, $http, $timeout, $mdDialog, $mdMedia, $mdSidenav, $mdToast, $q, config, Auth, Fire){
	$rootScope.version = 2.1;
	$rootScope.config = config;
	$rootScope.params = $routeParams;
	$rootScope.$mdMedia = $mdMedia;
	$rootScope.$mdToast = $mdToast;
	$rootScope.auth = $firebaseAuth();

	
	if(config.fire)
		Fire.config(config.fire);
	
	Auth.init($rootScope, (user, profile)=>{
			$rootScope.user = user;
			$rootScope.profile = profile;
			if(profile.isAnonymous){
				tools.alert(`Your data is only temporary - Signup to save your data.`, 'Signup').then(()=>{
					let provider = new firebase.auth.GoogleAuthProvider();
					provider.setCustomParameters({
						prompt: 'select_account'
					});
					firebase.auth().currentUser.linkWithPopup(provider)
					.then(()=>{})
					.catch(e=>{
						console.log(e);
						tools.alert(e)
					})
				})
			}
			tools.device.init(profile);
			if(tools._loginRes)
				tools._loginRes(user);
	}, ()=>{
		//handle guests...
	})
	
	// $firebaseAuth().$onAuthStateChanged(function(user) {
	// 	if(user){
	// 		$rootScope.user = user;
	// 		tools.profile.init(user);
	// 		// tools.profile.gapi(user);
	// 	}
	// });
	
	$rootScope._loginMethods = [{
		title: 		'Google',
		icon: 		'google',
		background:	'blue',
		provider: new firebase.auth.GoogleAuthProvider()
	}, {
		title: 		'Microsoft',
		icon: 		'windows',
		background:	'green',
		provider: new firebase.auth.OAuthProvider('microsoft.com')
	}, {
		title: 		'Github',
		icon: 		'github',
		background:	'grey',
		provider: new firebase.auth.GithubAuthProvider()
	}, {
		title: 		'Facebook',
		icon: 		'facebook',
		background:	'#1877f2',
		provider: new firebase.auth.FacebookAuthProvider()
	}, {
		title: 	'Email',
		icon: 	'envelope',
		type: 	'email',
		fn: 	()=>{
			let login = $rootScope.signupForm;
			if(!login){
				$rootScope.loginMethod = $rootScope._loginMethods.find(m=>m.type=='email');
			}else{
				let {email, password, displayName} = login;
				if($rootScope.signup){
					firebase.auth().createUserWithEmailAndPassword(email, password).then(cred=>{
						let user = cred.user;
						if(displayName)
							user.updateProfile({
								displayName:	displayName,
								photoURL:		it.profilePic
							})
					}).catch(e=>{
						if(e.code == 'auth/email-already-in-use')
							$rootScope.signup = false;
						tools.alert(e.message)
					})
				}else{
					if(email && !password){
						$rootScope.signup = true;
						tools.alert('Login Error, signup?')
					}else{
						firebase.auth().signInWithEmailAndPassword(email, password).catch(e=>{
							$rootScope.signup = true;
							tools.alert('Login Error, signup?')
						})
					}
				}
			}
			
			// firebase.auth().sendSignInLinkToEmail(login.email, {
			// 	url: window.location.href,
			// 	handleCodeInApp: true
			// }).then(()=>{
			// 	login.status = 'sent';
			// 	window.localStorage.setItem('emailForSignIn', login.email);
			// 	tools.alert('Email Sent - Check your email for a link.  It may take a few minutes to arrive.');
			// 	api.clear();
			// 	$timeout(()=>{
			// 		$mdDialog.show(
			// 			$mdDialog.alert()
			// 			.clickOutsideToClose(false)
			// 			.title('Email Login Link')
			// 			.textContent(`A link to login will be sent to your email ${login.email}.  Follow that link to login.`)
			// 			.ariaLabel('Close this window and check your email to finish logging in.')
			// 			// .ok('Close This Window')
			// 		);
			// 		window.location = '#/project/signin'
			// 	}, 1000);
			// }).catch((error)=>{
			// 	console.error({error});
			// 	tools.alert('Error logging in.');
			// 	delete $rootScope.login;
			// });
		}
	}, {
		title: 	'Quick Connect',
		icon: 	'key',
		type: 	'pin',
		fn: 	()=>{
			//Show the 6-digit code form in login.dialog.  The form's Connect button calls tools.quickConnect.redeem.
			$rootScope.qc = {code: ''};
			$rootScope.loginMethod = $rootScope._loginMethods.find(m=>m.type=='pin');
		}
	}]

	$rootScope.$on('$routeChangeStart', ($event, next, current)=>{
		Auth.reset();
		$mdToast.hide();
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
	$mdDialog.toggleFull = ()=>{
		$mdDialog._isFull = !$mdDialog._isFull;
		$('.canGoFull').each((idx,item)=>{
			if($mdDialog._isFull){
				$(item).attr('orig_style', $(item).attr('style'))
				$(item).attr('style', `width: 100vw; max-width: 100vw; min-height: 100vh;`);
			}else{
				$(item).attr('style', $(item).attr('orig_style'))
			}
		})
	}
	
	var tools = $rootScope.rootTools = $rootScope.tools = {
		init: function(){
			tools.loginCheck();
		},
		component: function(name){
			return 'component/'+name+'.html'
		},
		copy: (obj, context)=>{
			let copy = {};
			console.log('Copy object', obj)
		},
		loginCheck: ()=>{
			let getSession = ()=>{
				return new Promise(res=>{
					if($rootScope.params.emailLink){
						$http.post('project/admin/cloud/emailSession', {
							session: $scope.params.emailLink
						}).then(({data})=>{
							res(data)
						})
					}else{
						res({});
					}
				})
			}
			if(firebase.auth().isSignInWithEmailLink(window.location.href)){
				getSession().then(session=>{
					var email = window.localStorage.getItem('emailForSignIn') || session.email;
					if(!email)
						email = window.prompt('Please provide your email for confirmation');
					if(email)
						firebase.auth().signInWithEmailLink(email, window.location.href).catch(e=>{
							window.location.href = '/#/project/main';
						})
					else
						window.location.href = '/#/project/main';
				})
			}
		},
		login: function(method, signup){
			$rootScope.config.login = $rootScope.config.login || 'Google,Email';
			let loginOptions = $rootScope.config.login.split(',');
			$rootScope.signup = signup;
			tools._loginPromise = new Promise(res=>{
				if(!$rootScope.loginMethods){
					$rootScope.loginMethods = [];
					$rootScope._loginMethods.forEach(m=>{
						if($rootScope.config.login.includes(m.title)){
							$rootScope.loginMethods.push(m);
						}
					})
				}
				
				if($rootScope.signupForm){
					localStorage.setItem('signupDetails', JSON.stringify($rootScope.signupForm));
				}
				if(method){
					if(method.provider){
						$firebaseAuth().$signInWithPopup(method.provider);
					}else if(method.fn){
						method.fn()
					}
				}else if(loginOptions.length == 1 && $rootScope.loginMethods.length > 0){
					tools._loginRes = res;
					tools.login($rootScope.loginMethods[0])
				}else{
					tools._loginRes = res;
					tools.dialog('/core/login.dialog');
				}
			})
			tools._loginPromise.then(r=>{
				$mdDialog.hide();
			})
			return tools._loginPromise;
		},
		logout: function(){
			localStorage.clear();
			delete $rootScope.user;
			delete $rootScope.profile;
			delete $rootScope.myDevices;
			delete $rootScope.$device;
			delete $rootScope.session;
			$firebaseAuth().$signOut();
		},
		jwt: ()=>{
			return $q(res=>{
				let current = firebase.auth().currentUser;
				if(!current)
					return res(false);
				current.getIdToken(true).then(res).catch(e=>res(false));
			})
		},
		quickConnect: {
			//Quick Connect: a signed-in device gets a short-lived 6-digit code; another device enters it to sign in.
			//Only offered where the site's login setting includes 'Quick Connect'.
			_error: 'That code did not work. Get a new code and try again.',
			url: ()=>{
				//Same shape as ProjCtrl tools.cloud.path: origin + /project/<view>/cloud/<id>
				return pathValue(config, 'quickConnect.url') || window.location.origin+'/project/admin/cloud/quickConnect';
			},
			enabled: ()=>{
				return `${$rootScope.config.login || ''}`.split(',').map(s=>s.trim()).includes('Quick Connect');
			},
			canCreate: ()=>{
				//Any signed-in user (admins and root included) when the site enables Quick Connect.  Anonymous users are refused by the server, so hide it for them.
				return !!$rootScope.user && tools.quickConnect.enabled() && !pathValue($rootScope, 'profile.isAnonymous');
			},
			redeem: (code)=>{
				let qc = $rootScope.qc = $rootScope.qc || {};
				code = `${code || ''}`.trim();
				qc.error = null;
				if(!/^[0-9]{6}$/.test(code)){
					qc.error = 'Enter the 6-digit code.';
					return;
				}
				if(qc.busy)
					return;
				qc.busy = true;
				$http.post(tools.quickConnect.url(), {action: 'redeem', code}).then(({data})=>{
					if(data && data.customToken){
						//The Auth service (services.js) takes over from here and resolves tools.login().
						return $q.when(firebase.auth().signInWithCustomToken(data.customToken)).then(()=>{
							$rootScope.qc = {code: ''};
						});
					}
					throw (data && data.error);
				}).catch(e=>{
					qc.error = (typeof e == 'string' && e) || tools.quickConnect._error;
				}).finally(()=>{
					qc.busy = false;
				})
			},
			create: ()=>{
				let qcNew = $rootScope.qcNew = $rootScope.qcNew || {};
				$timeout.cancel(qcNew.timer);
				Object.assign(qcNew, {status: 'loading', code: null, error: null});
				tools.jwt().then(jwt=>{
					if(!jwt)
						throw 'Please sign in again and retry.';
					return $http.post(tools.quickConnect.url(), {action: 'create', jwt});
				}).then(({data})=>{
					if(!data || !data.code)
						throw (data && data.error);
					qcNew.code 		= data.code;
					qcNew.status 	= 'ready';
					qcNew.endsAt 	= Date.now() + (Number(data.expiresIn) || 180) * 1000;
					tools.quickConnect._tick();
				}).catch(e=>{
					qcNew.status 	= 'error';
					qcNew.error 	= (typeof e == 'string' && e) || 'Could not get a code. Please try again.';
				})
			},
			_tick: ()=>{
				let qcNew = $rootScope.qcNew;
				if(!qcNew || qcNew.status != 'ready')
					return;
				let left = Math.max(0, Math.round((qcNew.endsAt - Date.now()) / 1000));
				qcNew.clock = `${Math.floor(left/60)}:${String(left%60).padStart(2, '0')}`;
				if(left <= 0){
					qcNew.status 	= 'expired';
					qcNew.code 		= null;
					return;
				}
				qcNew.timer = $timeout(tools.quickConnect._tick, 1000);
			},
			show: ($event)=>{
				$rootScope.qcNew = {};
				tools.quickConnect.create();
				$mdDialog.show({
					scope: 			$rootScope,
					preserveScope: 	true,
					multiple: 		true,
					targetEvent: 	$event,
					parent: 		angular.element(document.body),
					clickOutsideToClose: true,
					template: `
						<md-dialog style="width: 360px; max-width: 90%;" aria-label="Quick Connect code">
							<md-toolbar><div class="md-toolbar-tools"><span>Quick Connect</span></div></md-toolbar>
							<md-dialog-content layout-padding style="text-align: center;">
								<p>On the other device, choose Login, then Quick Connect, and enter this code.</p>
								<md-progress-linear md-mode="indeterminate" ng-show="qcNew.status == 'loading'"></md-progress-linear>
								<div ng-show="qcNew.status == 'ready'">
									<div style="font-size: 44px; letter-spacing: 8px; font-family: monospace;">{{qcNew.code}}</div>
									<p>Expires in {{qcNew.clock}}. It works once.</p>
								</div>
								<p ng-show="qcNew.status == 'expired'">This code has expired.</p>
								<p class="md-warn" ng-show="qcNew.status == 'error'" role="alert">{{qcNew.error}}</p>
								<p style="font-size: small;">Only share this code with yourself. Anyone with it can sign in as you.</p>
							</md-dialog-content>
							<md-dialog-actions layout="row">
								<md-button ng-click="tools.quickConnect.create()" ng-show="qcNew.status == 'expired' || qcNew.status == 'error'">New code</md-button>
								<span flex></span>
								<md-button class="md-primary" ng-click="tools.quickConnect.close()">Close</md-button>
							</md-dialog-actions>
						</md-dialog>`
				}).finally(()=>{
					if($rootScope.qcNew)
						$timeout.cancel($rootScope.qcNew.timer);
					delete $rootScope.qcNew;
				});
			},
			close: ()=>{
				$mdDialog.hide();
			}
		},

		device: {
			init: (profile)=>{
				tools.device.get().then($device=>{
					console.log({$device})
					if(profile.version)
						profile.$fire.update({
							'stats.page': 				window.location.href,
							'stats.currentDevice': 		$device.id
						});

					new Fire(`profile/${profile.id}/stats`).add({
						page: 		window.location.href,
						deviceId: 	$device.id,
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
					
					let fbmKey = pathValue($rootScope, 'config.fire.messagingKey');
					if(fbmKey){
						try{
							let messaging = $rootScope.messaging = firebase.messaging();
							tools.device.messaging();
							tools.device.syncToken()
						}catch(e){
							console.error(e)
						}
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
			get: (deviceId)=>{
				deviceId = deviceId || localStorage.getItem('deviceId');
				let userId = $rootScope.user.uid;
				return new Promise((res,rej)=>{
					if(userId){
						if(deviceId){
							new Fire(`profile/${userId}/devices/${deviceId}`).get().then($device=>{
								$rootScope.$device = $device;
								if(!$device.version){
									localStorage.removeItem('device');
									localStorage.removeItem('deviceId');
									console.log('Device not found in profile.')
									tools.device.get();
								}
								res($device)
							})
						}else{
							presence.device.init().then(device=>{
								new Fire(`profile/${userId}/devices`).add(device).then($device=>{
									$rootScope.$device = $device;
									res($device)
								})
							})
						}
					}
				});
			},
			toggle: ()=>{
				if($rootScope.$device.subscribe){
					tools.device.register();
				}else{
					$rootScope.$device.$fire.save();
				}
			},
			register: ()=>{
				let defer = $q.defer();
				let $device = $rootScope.$device;
				if($device){
					let type = pathValue($device, 'browserStats.browser.name') || 'Unknown';
					$device.title 		= $device.title || `My ${type} Device`;
					$device.subscribe 	= true;
					
					$device.$fire.update({
						title: $device.title,
						subscribe: $device.subscribe
					})
					Notification.requestPermission().then(permission => {
						if(permission === 'granted'){
							tools.device.syncToken(true);
							defer.resolve();
						}else{
							tools.alert('You will have to manually enable notifications at the top of the page.');
							$rootScope.$device.$fire.update({
								status: 	'No Permission',
								token:		'_delete_'
							});
							defer.reject();
						}
					})
				}
				return defer.promise;
			},
			messaging: ()=>{
				$rootScope.messaging.onMessage((payload)=>{
					tools.alert('Message Received');
					it.lastMessage = payload;
					$rootScope.lastMessage = payload;
					let link = pathValue(payload, 'fcmOptions.link');
					$mdToast.show({
						template: `
							<md-toast>
								<md-button class="md-icon-button md-primary md-raised" style="margin-left: -14px;" ng-click="$mdToast.hide()">
									<i class="fa fa-close"></i>
								</md-button>
								<a ng-href="${link}" target="_blank" ng-click="$mdToast.hide()" flex>${payload.notification.body}</a>
							</md-toast>
						`,
						scope: $rootScope,
						preserveScope: true,
						position: 'bottom left',
						hideDelay: 0
					})
				});
			},
			syncToken: (registerRequest)=>{
				let fbmKey = pathValue($rootScope, 'config.fire.messagingKey');
				if(Notification.permission == 'granted' || registerRequest)
				// Register the site's messaging worker explicitly (the default /firebase-messaging-sw.js is not served).
				navigator.serviceWorker.register('/component/firebase-sw.js')
				.then(serviceWorkerRegistration=>$rootScope.messaging.getToken({vapidKey: fbmKey, serviceWorkerRegistration}))
				.then(token=>{
					if(token){
						if(token != $rootScope.$device.token){
							$rootScope.$device.$fire.update({
								token, status: 'Registered', error: null
							})
						}
					}else{
						console.log('token error - no response')
						$rootScope.$device.$fire.update({status: 'Unregistered'})
					}
				})
				.catch(function(err){
					console.log('token error', err)
					let status = 'Token Error';
					if($rootScope.$device.status != status){
						$rootScope.$device.$fire.update({
							status, error:	err.message
						})
					}
				});
			}
		},
		
		alert: function(message, confirm){
			if(confirm){
				return new Promise((res,rej)=>{
					$mdToast.show(
						$mdToast.simple().textContent(message).hideDelay(0).action(confirm)
					).then(r=>{
						if(r == 'ok')
							res();
						else
							rej();
					}).catch(e=>{
						rej();
					})
				})
			}else{
				$mdToast.show($mdToast.simple().textContent(message).hideDelay(5000));
			}
		},
		dialog: function(dialog, params){
			if(dialog.indexOf('http') != -1)
				dialog = $sce.trustAsResourceUrl(dialog);
			else if(dialog.indexOf('/core/') !== 0)	// platform templates are served as-is
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
		// tools.confirm('Delete this?', {title, ok, cancel}) resolves true or false.
		confirm: function(message, opts){
			opts = typeof opts == 'string' ? {title: opts} : (opts || {});
			let d = $mdDialog.confirm().multiple(true)
				.title(opts.title || 'Please confirm').textContent(message)
				.ok(opts.ok || 'OK').cancel(opts.cancel || 'Cancel');
			return $mdDialog.show(d).then(()=>true, ()=>false);
		},
		// tools.prompt('Your name?', {title, value, placeholder, required, ok, cancel}) resolves the text, or null if cancelled.
		prompt: function(message, opts){
			opts = typeof opts == 'string' ? {value: opts} : (opts || {});
			let d = $mdDialog.prompt().multiple(true)
				.title(opts.title || message).textContent(opts.title ? message : '')
				.placeholder(opts.placeholder || '').initialValue(opts.value || '')
				.required(!!opts.required)
				.ok(opts.ok || 'OK').cancel(opts.cancel || 'Cancel');
			return $mdDialog.show(d).then(v=>v, ()=>null);
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
				var card = Fire.prepare($scope.card)
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
	apiKey: "AIzaSyDYaLpwfUdfLXMLOkhNDhbwCDOpxLMJgRs",
	authDomain: "testalot-7830b.firebaseapp.com",
	databaseURL: "https://testalot-7830b.firebaseio.com",
	projectId: "testalot-7830b",
	storageBucket: "testalot-7830b.appspot.com",
	messagingSenderId: "629753159663",
	appId: "1:629753159663:web:052eedbf8f40b1b7"
}
// {
//     apiKey: "AIzaSyD_3nGYh1GA2Ucds20nm8ad8HsuHFXRxbg",
//     authDomain: "atfiliate.firebaseapp.com",
//     databaseURL: "https://atfiliate.firebaseio.com",
//     projectId: "atfiliate",
//     storageBucket: "atfiliate.appspot.com",
//     messagingSenderId: "126442541687",
//     appId: "1:126442541687:web:1819721adcc2b9fe24ec72"
// }
var whois = firebase.initializeApp(whoisConfig, "whois");

angular.element(function() {
	angular.bootstrap(document, ['app']);
});