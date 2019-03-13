/*global angular, app, firebase*/

app.lazy.controller('StoreCtrl', function MainCtrl($scope, $firebaseArray, $routeParams, Auth, Cloudinary, Stripe){
	$scope.cloudinary = Cloudinary;
	$scope.temp = {};
	
	var tools = $scope.tools = {
		init: function(){
			var productRef = firebase.database().ref().child("products");
			$scope.products = $firebaseArray(productRef);
			$scope.cart = [];
			Auth().then(function(account){
				var cartRef = firebase.database().ref().child("portal").child(account.uid).child('cart');
				$scope.cart = $firebaseArray(cartRef);
			})
		},
		product: {
			add: function(){
				var product = angular.copy($scope.temp.product)
				product.createdBy = $scope.user.uid;
				product.usedBy = $scope.user.uid;
				
				$scope.products.$add(product).then(function(r){
					$scope.temp.product = {}
				})
			},
			remove: function(product){
				if(confirm('Are you sure you want to delete this product?'))
					$scope.products.$remove(product).then(function(r){
						alert('product Removed')
					})
			},
			images: function(){
				if(!$scope.temp.product)
					$scope.temp.product = {}
				Cloudinary.upload().then(function(r){
				    $scope.temp.product.image = r[0];
				})
			},
			buy: function(product){
				Stripe.customer({
					number: 	'4242424242424242',
					exp_month:	'11',
					exp_year:	'2018',
					cvc:		'289'
				}).then(function(customer){
					$scope.customer = customer;
					Stripe.charge({
						amount: 		(Number(product.price) * 100),
						currency:		'usd',
						customer:		customer.id,
						source: 		customer.sources.data[0].id,
						description:	product.title
					}).then(function(r){
						alert('Item Purchased!')
					})
				});
			}
		},
		cart: {
			is: function(product){
				return $scope.cart.find(function(r){
					return product.$id == r.$value
				})
			},
			toggle: function(product){
				var iscart = tools.cart.is(product)
				if(iscart)
					$scope.cart.$remove(iscart)
				else
					$scope.cart.$add(product.$id)
			}
		}
	}
	tools.init();
	
	it.StoreCtrl = $scope;
});