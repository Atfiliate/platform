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
					description: 	request.body.params.name,
					email: 			request.body.params.email,
					source: 		request.body.params.source,
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
		firebase.auth().verifyIdToken(request.body.jwt).then(function(authUser){
			let params = request.body.params;
			if(params){
				if(params.interval){
					function getHash(s){ return Math.abs(s.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0)) }
					function getProduct(params){
						return new Promise((res,rej)=>{
							var hash = getHash(params.amount + params.interval + params.description);
							var ref = firebase.database().ref('stripe/plans/'+hash)
							ref.once('value', function(data){
								if(data.val()){
									res(data.val())
								}else{
									stripe.products.create({
										name: 		params.description,
										type: 		'service',
										statement_descriptor: params.description,
										unit_label: 'ul'
									}).then(product=>{
										ref.set(product).then(()=>{
											res(product)
										})
									}).catch(e=>{
										rej(e);
									})
								}
							})
						})
					}
					function getPlan(params){
						return new Promise((res,rej)=>{
							var hash = getHash(params.amount + params.interval + params.description);
							var ref = firebase.database().ref('stripe/plans/'+hash)
							ref.once('value', function(data){
								if(data.val()){
									res(data.val())
								}else{
									getProduct(params).then(product=>{
										var plan = {
											id: 				hash,
											product: 			product,
											nickname:			params.description,
											amount: 			params.amount,
											interval:			params.interval,
											interval_count:		params.interval_count || 1,
											currency:			params.currency
										}
										stripe.plans.create(plan).then(plan=>{
											ref.set(plan).then(()=>{
												res(plan)
											})
										}).catch(e=>{
											rej(e)
										});
									})
								}
							})
						})
					}
					getPlan(params).then(plan=>{
						let {customer, coupon, metadata, prorate, quantity, tax_percent, trial_end, trial_eriod_days} = params;
						var subsc = {
							customer, coupon, metadata, prorate, quantity, tax_percent, trial_end, trial_eriod_days,
							plan: plan.id,
							metadata: {
								uid: authUser.uid
							}
						}
						stripe.subscriptions.create(subsc).then(subscription=>{
							var ref = firebase.database().ref('stripe/subscriptions/'+subscription.id)
							ref.set(subscription).then(()=>{
								response.send(subscription)
							})
						}).catch(e=>{
							response.send(e)
						})
					}).catch(e=>{
						response.send(e)
					})
				}else{
					stripe.charges.create(request.body.params, function(e, charge) {
						if(e)
							response.send(e)
						else{
							var ref = firebase.database().ref('stripe/charges/'+charge.id)
							charge.metadata = {
								uid: authUser.uid
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