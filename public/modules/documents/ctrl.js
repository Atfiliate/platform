app.lazy.controller('DocCtrl', function MainCtrl($scope, $firebaseArray, $routeParams, Auth, config, $mdToast, $mdDialog, Cloudinary){
	$scope.cloudinary = Cloudinary;
	//For debugging only: 
	$scope.rp		= $routeParams;
	$scope.fbObj	= $firebaseArray;
	$scope.temp     = {}
	//End random scripts
	
	var tools = $scope.tools = {
		init: function(){
			var docsRef = firebase.database().ref().child("docs");
			$scope.docs = $firebaseArray(docsRef);
			$scope.bookmarks = [];
			Auth().then(function(account){
				var bookmarksRef = firebase.database().ref().child("portal").child(account.uid).child('bookmarks');
				$scope.bookmarks = $firebaseArray(bookmarksRef);
			})
		},
		doc: {
			add: function(){
				var doc = angular.copy($scope.temp.doc)
				doc.createdBy = $scope.user.uid;
				doc.usedBy = $scope.user.uid;
				
				$scope.docs.$add(doc).then(function(r){
					$scope.temp.doc = {}
				})
			},
			remove: function(doc){
				if(confirm('Are you sure you want to delete this document?'))
					$scope.docs.$remove(doc).then(function(r){
						alert('Document Removed')
					})
			},
			images: function(){
				if(!$scope.temp.doc)
					$scope.temp.doc = {}
				Cloudinary.upload().then(function(r){
				    $scope.temp.doc.image = r[0];
				})
			},
			edit: function(item){
				$scope.focus = item;
				$mdDialog.show({
					scope: $scope,
					preserveScope: true,
					templateUrl: 'modules/docs/partials/editDialog.html',
					parent: angular.element(document.body),
					clickOutsideToClose: true
				});
			},
		},
		bookmark: {
			is: function(doc){
				return $scope.bookmarks.find(function(r){
					return doc.$id == r.$value
				})
			},
			toggle: function(doc){
				var isbookmark = tools.bookmark.is(doc)
				if(isbookmark)
					$scope.bookmarks.$remove(isbookmark)
				else
					$scope.bookmarks.$add(doc.$id)
			}
		},
		// edit: function(r){
		// 	$scope.edit = r;
		// 	//show edit modal.
		// }
	}
	tools.init();
	
	it.DocCtrl = $scope;
});