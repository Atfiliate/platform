app.lazy.controller('MainCtrl', function MainCtrl($scope, $firebaseObject, $routeParams, config, $mdToast, Cloudinary){
	var tools = $scope.tools = {
		edit: function(){
			Cloudinary.upload().then(function(img){
				$scope.img = img[0].secure_url;
			})
		}
	}
	it.MainCtrl = $scope;
});