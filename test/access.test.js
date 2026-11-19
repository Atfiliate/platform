// Run: node test/access.test.js
const assert = require('assert');
const access = require('../cloud/access.js');
const headers = require('../cloud/headers.js');

assert.strictEqual(access.versionAccess(null, null), 'public');
assert.strictEqual(access.versionAccess({id: 'a', stage: 'dev'}, {id: 'a'}), 'public');
assert.strictEqual(access.versionAccess({id: 'b', stage: 'prod'}, {id: 'a'}), 'public');
assert.strictEqual(access.versionAccess({id: 'c', stage: 'dev'}, {id: 'a'}), 'developer');
assert.strictEqual(access.versionAccess({id: 'd'}, null), 'developer');

assert.strictEqual(access.isDeveloper(null, 'x'), false);
assert.strictEqual(access.isDeveloper({root: true}, 'x'), true);
assert.strictEqual(access.isDeveloper({root: {all: true}}, 'x'), true);
assert.strictEqual(access.isDeveloper({developer: {all: true}}, 'x'), true);
assert.strictEqual(access.isDeveloper({developer: {x: true}}, 'x'), true);
assert.strictEqual(access.isDeveloper({developer: {y: true}}, 'x'), false);
assert.strictEqual(access.isDeveloper({developer: {x: 'yes'}}, 'x'), false);
assert.strictEqual(access.isDeveloper({admin: {all: true}}, 'x'), false);

assert.strictEqual(access.tokenOf({headers: {authorization: 'Bearer t1'}}), 't1');
assert.strictEqual(access.tokenOf({headers: {}, body: {jwt: 't2'}}), 't2');
assert.strictEqual(access.tokenOf({headers: {}, body: {jwt: 5}}), '');

function run(mw, path, hdrs, env){
	let set = {};
	mw(Object.assign({path, headers: hdrs || {}, protocol: 'http'}), {setHeader: (k, v)=>{ set[k] = v; }}, ()=>{});
	return set;
}
let mw = headers.create({});
let page = run(mw, '/main', {'x-forwarded-proto': 'https'});
assert.strictEqual(page['X-Content-Type-Options'], 'nosniff');
assert.strictEqual(page['Referrer-Policy'], 'strict-origin-when-cross-origin');
assert.ok(page['Strict-Transport-Security']);
assert.strictEqual(page['X-Frame-Options'], undefined);
for(const p of ['/component/x', '/project/a/component/b.js', '/cloud/pixel', '/project'])
	assert.strictEqual(run(mw, p)['X-Content-Type-Options'], undefined, p);
assert.strictEqual(run(mw, '/main')['Strict-Transport-Security'], undefined);
assert.strictEqual(run(headers.create({frameOptions: 'sameorigin'}), '/main')['X-Frame-Options'], 'SAMEORIGIN');
assert.strictEqual(run(headers.create({frameOptions: 'ALLOW-FROM x'}), '/main')['X-Frame-Options'], undefined);

console.log('access + headers: ok');
