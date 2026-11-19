// Run: node --test test/http.test.js
// cloud/http.js against a local server: JSON, form, qs, auth, status errors, full response, Buffer bodies.
const test = require('node:test');
const assert = require('assert');
const httpServer = require('http');
const {http} = require('../cloud/http.js');

let server, base;
test.before(()=>new Promise(r=>{
	server = httpServer.createServer((req, res)=>{
		let chunks = [];
		req.on('data', c=>chunks.push(c)).on('end', ()=>{
			let u = new URL(req.url, 'http://x');
			if(u.pathname == '/status') { res.statusCode = Number(u.searchParams.get('code')); return res.end('{"error":"nope"}'); }
			if(u.pathname == '/bin') return res.end(Buffer.from([1, 2, 3]));
			if(u.pathname == '/redirect') { res.statusCode = 302; res.setHeader('location', '/echo'); return res.end(); }
			res.setHeader('content-type', 'application/json');
			res.end(JSON.stringify({method: req.method, path: u.pathname, query: Object.fromEntries(u.searchParams), headers: req.headers, body: Buffer.concat(chunks).toString()}));
		});
	}).listen(0, ()=>{ base = `http://127.0.0.1:${server.address().port}`; r(); });
}));
test.after(()=>server.close());

test('json: object body sent as JSON, reply parsed', async ()=>{
	let r = await http({method: 'POST', uri: base + '/echo', body: {a: 1}, json: true, headers: {'X-Test': 'y'}});
	assert.strictEqual(r.method, 'POST');
	assert.strictEqual(r.headers['content-type'], 'application/json');
	assert.strictEqual(r.headers['x-test'], 'y');
	assert.deepStrictEqual(JSON.parse(r.body), {a: 1});
});

test('string url, qs (arrays repeat), GET has no body', async ()=>{
	let r = JSON.parse(await http(base + '/echo?x=1'));
	assert.strictEqual(r.query.x, '1');
	let q = await http({url: base + '/echo', qs: {a: 'b', n: 2, skip: undefined}, json: true});
	assert.deepStrictEqual(q.query, {a: 'b', n: '2'});
	assert.strictEqual(q.body, '');
});

test('form and auth', async ()=>{
	let r = await http({method: 'POST', url: base + '/echo', form: {a: 'x y', b: 1, to: ['p@x.test', 'q@x.test']}, auth: {user: 'u', pass: 'p'}, json: true});
	assert.strictEqual(r.body, 'a=x+y&b=1&to=p%40x.test&to=q%40x.test');
	assert.strictEqual(r.headers['content-type'], 'application/x-www-form-urlencoded');
	assert.strictEqual(r.headers.authorization, 'Basic ' + Buffer.from('u:p').toString('base64'));
	let b = await http({url: base + '/echo', auth: {bearer: 't'}, json: true});
	assert.strictEqual(b.headers.authorization, 'Bearer t');
});

test('non-2xx rejects as StatusCodeError unless simple is false', async ()=>{
	await assert.rejects(http({url: base + '/status?code=404', json: true}), e=>e.name == 'StatusCodeError' && e.statusCode == 404 && e.error.error == 'nope');
	let r = await http({url: base + '/status?code=500', simple: false, resolveWithFullResponse: true});
	assert.strictEqual(r.statusCode, 500);
});

test('encoding null gives a Buffer; followRedirect false returns the 3xx', async ()=>{
	let b = await http({url: base + '/bin', encoding: null});
	assert.ok(Buffer.isBuffer(b));
	assert.deepStrictEqual([...b], [1, 2, 3]);
	let r = await http({url: base + '/redirect', followRedirect: false, resolveWithFullResponse: true});
	assert.strictEqual(r.statusCode, 302);
	assert.strictEqual(r.headers.location, '/echo');
});

test('unknown options and missing url fail loudly', async ()=>{
	await assert.rejects(http({url: base, gzip: true}), e=>e.code == 'HTTP_OPTION_UNSUPPORTED');
	await assert.rejects(http({method: 'GET'}), e=>e.code == 'HTTP_URL_REQUIRED');
});
