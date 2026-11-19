// Security headers for every response. Kept compatible with existing sites:
// - no CSP and no frame blocking by default (sites embed and are embedded);
//   set env frameOptions (e.g. SAMEORIGIN) to send X-Frame-Options.
// - nosniff is skipped on code routes (/component, /project, /cloud), where some
//   files are still served without a matching Content-Type.
const CODE_ROUTE = /^\/(component|project|cloud)(\/|$)/;

function create(env){
	env = env || process.env;
	let frame = String(env.frameOptions || '').toUpperCase();
	if(frame != 'DENY' && frame != 'SAMEORIGIN') frame = '';
	return function securityHeaders(req, res, next){
		res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
		if(!CODE_ROUTE.test(req.path || ''))
			res.setHeader('X-Content-Type-Options', 'nosniff');
		let proto = String(req.headers['x-forwarded-proto'] || req.protocol || '').split(',')[0].trim();
		if(proto == 'https')
			res.setHeader('Strict-Transport-Security', 'max-age=15552000');
		if(frame)
			res.setHeader('X-Frame-Options', frame);
		next();
	};
}

module.exports = {create, CODE_ROUTE};
