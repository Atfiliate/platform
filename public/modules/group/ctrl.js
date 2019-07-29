app.lazy.controller('GroupCtrl', function MainCtrl($scope, $firebaseArray, $firebaseObject, $routeParams, $timeout, Auth, config, $mdToast, $mdDialog, Cloudinary) {
	$scope.cloudinary = Cloudinary;
	//For debugging only: 
	$scope.rp = $routeParams;
	$scope.fbObj = $firebaseArray;
	$scope.temp = {}
		//End random scripts

	var tools = $scope.tools = {
		init: function() {
			Auth().then(function(account) {
				// var profileRef = firebase.database().ref().child("profile").child(account.uid);
				// $scope.profile = $firebaseObject(profileRef);
				$scope.profile.$loaded(function(profile) {
					if($routeParams.view)
						tools.group.load($routeParams.view);
					else if(profile.group)
						tools.group.load(profile.group);
					else
						tools.group.browse();
				})
			})
		},
		view: function(){
			if($scope.groups)
				return 'modules/group/views/groups.html'
			else if($scope.group)
				if($scope.group.title)
					return 'modules/group/views/group.html'
				else
					return 'modules/group/views/pending.html'
		},
		partial: function(partial){
			if(partial)
				$scope.partial = partial;
			if($scope.partial)
				return 'modules/group/partials/'+$scope.partial+'.html'
			else
				return 'modules/group/partials/main.html'
		},
		group: {
			clear: function(){
				$scope.groups = null;
				$scope.group = null;
				$scope.feed = null;
				$scope.members = null;
			},
			browse: function(){
				tools.group.clear();
				var groupRef = firebase.database().ref().child('group').child('list');
				$scope.groups = $firebaseArray(groupRef);
			},
			load: function(groupId){
				tools.group.clear();
				var groupRef = firebase.database().ref().child('group').child('list').child(groupId);
				$scope.group	= $firebaseObject(groupRef);
				$scope.group.$loaded(function(){
					$scope.members	= $firebaseArray(firebase.database().ref().child('group').child('members').child(groupId));
					$scope.feed 	= $firebaseArray(firebase.database().ref().child('group').child('feed').child(groupId).orderByChild('order').limitToFirst(10));
					$scope.members.$loaded(function(m){
						if(m.length == 0){
							tools.people.add({
								$id:			$scope.user.uid,
								displayName:	$scope.user.displayName,
								photoURL:		$scope.user.photoURL
							});
						}
					})
				})
			},
			create: function(){
				var g = {}
				g.title = $scope.temp.group.title;
				g.owner = $scope.user.uid;
				if($scope.temp.group.image)
					g.image = $scope.temp.group.image;
				$scope.groups.$ref().child(g.owner).set(g).then(function(r){
					tools.group.join(g.owner)
				})
			},
			setImage: function(){
				$scope.temp.group = $scope.temp.group || {};
				Cloudinary.upload().then(function(r){
					$scope.temp.group.image = r[0];
				})
			},
			join: function(groupId){
				$scope.profile.group = groupId;
				$scope.profile.$save();
				tools.group.load(groupId)
			}
		},
		people: {
			toggleSearch: function(){
				$scope.addPeople = !$scope.addPeople;
				if($scope.addPeople)
					$timeout(function(){
						$('#peopleSearch').focus()
					})
			},
			search: function(search){
				if(search.length > 1){
					if(!$scope.profiles){
						var profileRef = firebase.database().ref().child("profile").orderByChild("displayName").startAt(search)
						$scope.profiles = $firebaseArray(profileRef);
					}
					$scope.profiles.$loaded(function(r){
						$scope.people = r.filter(function(p){
							var s = search.split(' ')
							var matches = true;
							s.forEach(function(name){
								if(p.displayName.toLowerCase().indexOf(name.toLowerCase()) == -1)
									matches = false;
							})
							return matches;
						})
					})
				}else{
					$scope.people = [];
				}
			},
			add: function(person){
				$scope.members.$ref().child(person.$id).set({
					displayName: person.displayName,
					photoURL: person.photoURL
				});
			}
		},
		feed: {
			add: function(){
				if($scope.temp.entry){
					var entry = $scope.temp.entry;
					entry.createdBy = $scope.user.uid;
					entry.order = -moment().unix()
					$scope.feed.$add(entry).then(function(r){
						delete $scope.temp.entry;
					})
				}
			},
			addPicture: function(){
				$scope.entry = $scope.entry || {};
				Cloudinary.upload($scope.entry)
			}
		}
	}
	tools.init();

	it.GroupCtrl = $scope;
});