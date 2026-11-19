js = {
	// Image proxy for the core image browser (Pixabay previews) and Cloudinary images.
	// Allowlisted hosts only, no redirects. Streams the image with its type and cache headers.
	allowed: [/^https:\/\/pixabay\.com\//, /^https:\/\/res\.cloudinary\.com\//],
	init: function(req, res){
		let url = String(req.query.url || '');
		if(!js.allowed.some(re=>re.test(url)))
			return res.status(403).send({error: 'Only Pixabay and Cloudinary images can be proxied.'});
		fetch(url, {redirect: 'manual'}).then(r=>{
			if(r.status != 200 || !r.body)
				return res.status(502).send({error: 'Proxy fetch failed'});
			['content-type', 'cache-control', 'etag', 'last-modified'].forEach(h=>{
				let v = r.headers.get(h);
				if(v) res.setHeader(h, v);
			});
			require('stream').Readable.fromWeb(r.body).on('error', ()=>res.end()).pipe(res);
		}).catch(e=>{
			if(!res.headersSent) res.status(502).send({error: 'Proxy fetch failed'});
		});
	}
}
