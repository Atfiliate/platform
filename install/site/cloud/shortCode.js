js = {
	// Short link redirect (/cloud/shortCode/:id).
	// GET /project/site/cloud/shortCode/<id> (or ?id=<id>) -> 302 to meterBill/shortCode-<id> _config.link; counts usage.
	init: async (request, response)=>{
		let id = String(request.params.id || request.query.id || '');
		if(!/^[A-Za-z0-9_-]{1,64}$/.test(id))
			return response.status(400).send({error: 'Missing or invalid short code id'});
		let shortCode;
		try{
			shortCode = await new Fire(`meterBill/shortCode-${id}`).get();
		}catch(e){
			return response.status(500).send({error: 'Short code lookup failed'});
		}
		let link = shortCode && shortCode._config && shortCode._config.link;
		if(!link || !(/^https?:\/\//i.test(link) || /^\/(?!\/)/.test(link)))
			return response.status(404).send({error: 'Short code not found'});
		response.redirect(302, link);
		if(shortCode.$fire && shortCode.$fire.update)
			shortCode.$fire.update({'_rate.usage': firebase.firestore.FieldValue.increment(1)}).catch(e=>console.log('shortCode usage update failed', id));
	}
}
