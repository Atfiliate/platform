js = {
	// Upload an image to the site's Cloudinary account (/cloud/cl_img).
	// POST {jwt, imgUrl, metaData?} (or Authorization: Bearer <ID token>). imgUrl: data:image/... or a public https URL.
	// Returns the Cloudinary upload result (secure_url, public_id, ...). Signed-in users only.
	options: ['folder', 'tags', 'context'],
	init: async (request, response)=>{
		let missing = ['cloudinaryName', 'cloudinaryKey', 'cloudinaryToken'].filter(k=>!process.env[k]);
		if(missing.length)
			return response.status(503).send({error: 'Missing env var(s): ' + missing.join(', '), missing});
		let body = request.body || {};
		let jwt = body.jwt || String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
		if(!jwt)
			return response.status(401).send({error: 'Sign-in required'});
		try{
			await firebase.auth().verifyIdToken(jwt);
		}catch(e){
			return response.status(401).send({error: 'Invalid sign-in token'});
		}
		let imgUrl = String(body.imgUrl || '');
		if(!js.allowedSource(imgUrl))
			return response.status(400).send({error: 'imgUrl must be a data:image URI or a public https URL'});
		let meta = body.metaData || {};
		let opts = {};
		js.options.forEach(k=>{ if(meta[k] != null) opts[k] = meta[k]; });
		try{
			let result = await cloudinary.v2.uploader.upload(imgUrl, opts);
			response.send(result);
		}catch(e){
			response.status(502).send({error: (e && e.message) || 'Upload failed'});
		}
	},
	allowedSource: (u)=>{
		if(/^data:image\/[a-z0-9.+-]+;base64,/i.test(u))
			return true;
		let url;
		try{ url = new URL(u); }catch(e){ return false; }
		if(url.protocol !== 'https:' || url.username || url.password)
			return false;
		let h = url.hostname.toLowerCase();
		if(h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.'))
			return false;
		if(/^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('['))
			return false; // IP literals (incl. metadata/private ranges) not allowed
		return true;
	}
}
