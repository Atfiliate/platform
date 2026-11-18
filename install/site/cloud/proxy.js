js = {
	// Image proxy for the core image browser (Pixabay previews) and Cloudinary images.
	// Allowlisted hosts only, no redirects.
	allowed: [/^https:\/\/pixabay\.com\//, /^https:\/\/res\.cloudinary\.com\//],
	init: function(req, res){
		let url = String(req.query.url || '');
		if(!js.allowed.some(re=>re.test(url)))
			return res.status(403).send({error: 'Only Pixabay and Cloudinary images can be proxied.'});
		let request = require('request');
		request.get({url, followRedirect: false})
			.on('error', e=>{ if(!res.headersSent) res.status(502).send({error: 'Proxy fetch failed'}); })
			.pipe(res);
	}
}
