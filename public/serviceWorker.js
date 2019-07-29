this.addEventListener('install', function(event) {
	event.waitUntil(
		caches.open('v1').then(function(cache) {
			return cache.addAll([
				'//ajax.googleapis.com/ajax/libs/angular_material/1.1.0/angular-material.min.css',
				'//ajax.googleapis.com/ajax/libs/angularjs/1.6.1/angular.min.js">',
				'//ajax.googleapis.com/ajax/libs/angularjs/1.6.1/angular-aria.min.js">',
				'//ajax.googleapis.com/ajax/libs/angularjs/1.6.1/angular-messages.min.js">',
				'//ajax.googleapis.com/ajax/libs/angularjs/1.6.1/angular-animate.min.js">',
				'//ajax.googleapis.com/ajax/libs/angularjs/1.6.1/angular-resource.min.js">',
				'//ajax.googleapis.com/ajax/libs/angularjs/1.6.1/angular-route.min.js">',
				'//ajax.googleapis.com/ajax/libs/angular_material/1.1.0/angular-material.min.js">',
				'//www.gstatic.com/firebasejs/3.6.7/firebase.js">',
				'//cdn.firebase.com/libs/angularfire/2.3.0/angularfire.min.js">',
				'//use.fontawesome.com/815a817077.js">'
			]);
		})
	);
});