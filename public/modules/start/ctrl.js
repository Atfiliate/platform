/*global angular, app, firebase*/

app.lazy.controller('StartCtrl', function MainCtrl($scope, $firebaseArray, $routeParams, Auth){
	var tools = $scope.tools = {
		init: function(){
			Auth().then(user=>{
				if($scope.profile)
					$scope.profile.$fire.save();
				firebase.database().ref('site/public/roles').child(user.uid).child('admin').set('rw')
				whois.database().ref('site/public/seed').once('value', snap=>{
					var seed = snap.val();
					Object.keys(seed).forEach(k=>{
						var entry = seed[k];
						whois.database().ref(entry).once('value', snap=>{
							firebase.database().ref(entry).set(snap.val());
						})
					})
				})
				
			})
		}
	}
	tools.init();
	it.StartCtrl = $scope;
});
