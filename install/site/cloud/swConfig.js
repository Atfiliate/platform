// swConfig: the public Firebase web config for this site's messaging service worker.
// GET /cloud/swConfig (site project) -> JavaScript that sets self.firebaseConfig from env config.firebase.
// Only the public web-config keys are sent (the same values the page shell already serves). No secrets.
js={
	init: (request, response)=>{
		response.set('Content-Type', 'application/javascript; charset=utf-8');
		response.set('Cache-Control', 'no-cache');
		let cfg = null;
		try{ cfg = JSON.parse(process.env.config || '').firebase; }catch(e){}
		let need = ['apiKey', 'projectId', 'messagingSenderId', 'appId'];
		let missing = cfg ? need.filter(k=>!cfg[k]) : need;
		if(missing.length)
			return response.status(503).send(`throw new Error(${JSON.stringify('Missing env var: config (firebase.' + missing.join(', firebase.') + ')')});`);
		let pub = {};
		['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'].forEach(k=>{ if(cfg[k]) pub[k] = cfg[k]; });
		response.send('self.firebaseConfig = ' + JSON.stringify(pub) + ';');
	}
}