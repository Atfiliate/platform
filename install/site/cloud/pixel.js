js = {
	// Pixabay image search for the core image browser.
	// GET ?q=<term>&page=&per_page=&min_width=&response_group=... -> Pixabay results; hits[].iPreview goes through site proxy.
	// Key comes from env pixabayKey only; it is never logged or returned.
	params: ['q', 'page', 'per_page', 'min_width', 'min_height', 'response_group', 'image_type', 'orientation', 'category', 'order', 'safesearch', 'lang', 'colors', 'editors_choice', 'id'],
	init: async (request, response)=>{
		if(!process.env.pixabayKey)
			return response.status(503).send({error: 'Missing env var: pixabayKey', missing: ['pixabayKey']});
		let qs = new URLSearchParams({key: process.env.pixabayKey});
		js.params.forEach(k=>{
			if(request.query[k] != null && request.query[k] !== '')
				qs.set(k, String(request.query[k]));
		});
		try{
			let r = await fetch('https://pixabay.com/api/?' + qs.toString());
			if(!r.ok)
				return response.status(502).send({error: 'Image search failed', status: r.status});
			let results = await r.json();
			(results.hits || []).forEach(h=>{
				h.iPreview = '/project/site/cloud/proxy?url=' + encodeURIComponent(h.webformatURL || '');
			});
			response.send(results);
		}catch(e){
			response.status(502).send({error: 'Image search failed'});
		}
	}
}
