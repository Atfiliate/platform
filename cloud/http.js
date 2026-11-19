// http(options): the HTTP client for cloud handlers, built on Node's fetch. Promise only.
// form: arrays repeat the key, objects are sent as JSON text.
// options: a URL string, or {url|uri, method, qs, headers, json, body, form, formData, auth, timeout,
//   encoding: null (Buffer body), resolveWithFullResponse, simple (default true), followRedirect}.
// json: true sends an object body as JSON and parses the reply as JSON (text if it is not JSON).
// A non-2xx reply rejects with {name: 'StatusCodeError', statusCode, error: body} unless simple is false.
// Any other option throws HTTP_OPTION_UNSUPPORTED so a typo fails loudly.
const KNOWN = new Set(['url', 'uri', 'method', 'qs', 'headers', 'json', 'body', 'form', 'formData', 'auth', 'timeout',
	'encoding', 'resolveWithFullResponse', 'simple', 'followRedirect']);

function named(code, message, extra){
	return Object.assign(new Error(`${code}: ${message}`), {code}, extra || {});
}

function buildUrl(opts){
	let url = opts.url || opts.uri;
	if(!url) throw named('HTTP_URL_REQUIRED', 'url (or uri) is required');
	let u = new URL(String(url));
	Object.entries(opts.qs || {}).forEach(([k, v])=>{
		if(v === undefined) return;
		[].concat(v).forEach(x=>u.searchParams.append(k, typeof x == 'object' ? JSON.stringify(x) : String(x)));
	});
	return u;
}

function buildInit(opts){
	let headers = new Headers(opts.headers || {});
	let init = {method: String(opts.method || 'GET').toUpperCase(), headers, redirect: opts.followRedirect === false ? 'manual' : 'follow'};
	let body = opts.body !== undefined ? opts.body : (opts.json && typeof opts.json == 'object' ? opts.json : undefined);
	if(opts.form !== undefined){
		if(typeof opts.form == 'string') body = opts.form;
		else{
			// Arrays repeat the key (to=a&to=b); objects are sent as JSON text.
			let p = new URLSearchParams();
			Object.entries(opts.form).forEach(([k, v])=>{
				if(v === undefined) return;
				[].concat(v).forEach(x=>p.append(k, x && typeof x == 'object' ? JSON.stringify(x) : String(x)));
			});
			body = p.toString();
		}
		if(!headers.has('content-type')) headers.set('content-type', 'application/x-www-form-urlencoded');
	}else if(opts.formData !== undefined){
		let fd = new FormData();
		Object.entries(opts.formData).forEach(([k, v])=>{
			if(v && typeof v == 'object' && 'value' in v){
				let o = v.options || {};
				fd.append(k, new Blob([v.value], {type: o.contentType || 'application/octet-stream'}), o.filename || k);
			}else if(Buffer.isBuffer(v)) fd.append(k, new Blob([v]), k);
			else fd.append(k, typeof v == 'object' ? JSON.stringify(v) : String(v));
		});
		body = fd;
	}else if(body !== undefined && body !== null && typeof body == 'object' && !Buffer.isBuffer(body) && !(body instanceof Uint8Array)){
		body = JSON.stringify(body);
		if(!headers.has('content-type')) headers.set('content-type', 'application/json');
	}
	if(opts.json && !headers.has('accept')) headers.set('accept', 'application/json');
	if(body !== undefined && init.method != 'GET' && init.method != 'HEAD') init.body = body;
	let a = opts.auth;
	if(a){
		if(a.bearer) headers.set('authorization', `Bearer ${a.bearer}`);
		else headers.set('authorization', 'Basic ' + Buffer.from(`${a.user || a.username || ''}:${a.pass || a.password || ''}`).toString('base64'));
	}
	if(opts.timeout) init.signal = AbortSignal.timeout(Number(opts.timeout));
	return init;
}

async function http(opts){
	if(typeof opts == 'string') opts = {url: opts};
	opts = opts || {};
	let bad = Object.keys(opts).filter(k=>!KNOWN.has(k));
	if(bad.length) throw named('HTTP_OPTION_UNSUPPORTED', bad.join(', '));
	let url = buildUrl(opts);
	let r = await fetch(url, buildInit(opts));
	let body;
	if(opts.encoding === null) body = Buffer.from(await r.arrayBuffer());
	else{
		body = await r.text();
		if(opts.json){
			try{ body = body === '' ? undefined : JSON.parse(body); }catch(e){}
		}
	}
	let full = {statusCode: r.status, headers: Object.fromEntries(r.headers.entries()), body};
	if(opts.simple !== false && (r.status < 200 || r.status >= 300) && !(opts.followRedirect === false && r.status >= 300 && r.status < 400))
		throw Object.assign(named('HTTP_STATUS', `${r.status} from ${url.host}`), {name: 'StatusCodeError', statusCode: r.status, error: body, response: full});
	return opts.resolveWithFullResponse ? full : body;
}

module.exports = {http, KNOWN};
