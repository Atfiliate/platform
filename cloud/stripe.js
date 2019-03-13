var firebase	= require('firebase-admin');
var stripe		= require("stripe")(process.env.stripe);

module.exports = {
	customer: function(request, response) {
		firebase.auth().verifyIdToken(request.body.jwt).then(function(r){
			var uid = r.uid;
			if(request.body.params.customer){
				stripe.customers.createSource(request.body.params.customer, {
					source: request.body.params.source
				}, function(err, card) {
					if(err)
						response.send({error: err, card: card})
					else{
						var ref = firebase.database().ref('stripe/customers/'+uid+'/sources/data');
						ref.push(card);
						response.send(card)
					}
				});
			}else{
				stripe.customers.create({
					description: request.body.params.name,
					email: request.body.params.email,
					source: request.body.params.source,
					metadata: {
						uid: uid
					}
				}, function(err, customer) {
					if(err)
						response.send({error: err, customer: customer})
					else{
						var ref = firebase.database().ref('stripe/customers/'+uid);
						ref.set(customer);
						response.send(customer)
					}
				});
			}
		}).catch(function(e) {
			response.send(e)
		});
	}, 
	checkout: function(request, response){
		firebase.auth().verifyIdToken(request.body.jwt).then(function(r){
			var uid = r.uid;
			if(request.body.params){
				if(request.body.params.interval){
					var params = request.body.params
					function getHash(s){ return Math.abs(s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)) }
					function getPlan(params, callback){
						var hash = getHash(params.amount + params.interval + params.description);
						var ref = firebase.database().ref('stripe/plans/'+hash)
						ref.once('value', function(data){
							if(data.val()){
								callback(data.val())
							}else{
								var plan = {
									id: 				hash,
									name:				params.description,
									amount: 			params.amount,
									interval:			params.interval,
									interval_count:		params.interval_count || 1,
									currency:			params.currency
								}
								stripe.plans.create(plan, function(e, plan) {
									if(e){
										response.send(e);
									}else{
										ref.set(plan).then(function(){
											callback(plan)
										})
									}
								});
							}
						})
					}
					getPlan(params, function(plan){
						var planAttrs = ['customer', 'coupon', 'metadata', 'prorate', 'quantity', 'source', 'tax_percent', 'trial_end', 'trial_eriod_days'];
						var params = {};
						planAttrs.forEach(function(a){
							if(request.body.params[a])
								params[a] = request.body.params[a]
						})
						params.plan = plan.id;
						params.metadata = {
							uid: uid
						}
						stripe.subscriptions.create(params, function(e, subscription) {
							if(e)
								response.send(e)
							else{
								var ref = firebase.database().ref('stripe/subscriptions/'+subscription.id)
								ref.set(subscription).then(function(){
									response.send(subscription)
								})
							}
						})
					})
				}else{
					stripe.charges.create(request.body.params, function(e, charge) {
						if(e)
							response.send(e)
						else{
							var ref = firebase.database().ref('stripe/charges/'+charge.id)
							charge.metadata = {
								uid: uid
							}
							ref.set(charge).then(function(){
								response.send(charge)
							})
						}
					});
				}
			}else{
				response.send('You must include the parameters for checkout.')
			}
		})
	}
}