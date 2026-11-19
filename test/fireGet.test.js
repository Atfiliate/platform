// Run: node test/fireGet.test.js
// A collection read error must reject Fire.get() instead of throwing ReferenceError (deferred).
const assert = require('assert');
const Module = require('module');
const path = require('path');

let failRead = false;
const fake = {
		apps: [{}],
		firestore: ()=>({
			collection: ()=>({
				get: ()=>failRead ? Promise.reject(new Error('read denied')) : Promise.resolve({forEach: ()=>{}}),
				onSnapshot: ()=>()=>{}
			}),
			doc: (p)=>({get: ()=>Promise.resolve({id: p, ref: {}, exists: true, data: ()=>({})})})
		}),
	};
const stubs = {
	// Only the modular API exists (firebase-admin 14); loading the namespace entry point is a test failure.
	'firebase-admin': new Proxy({}, {get: (t, k)=>{ throw new Error('firebase-admin namespace used: ' + String(k)); }}),
	'firebase-admin/app': {getApps: ()=>fake.apps, getApp: ()=>({}), initializeApp: ()=>{}, cert: ()=>({})},
	'firebase-admin/firestore': {getFirestore: ()=>fake.firestore(), FieldValue: {delete: ()=>({$delete: true}), increment: n=>({$increment: n})}, FieldPath: {documentId: ()=>'__name__'}, Timestamp: {}, GeoPoint: function(){}},
	'firebase-admin/auth': {getAuth: ()=>fake.auth ? fake.auth() : {}},
	'firebase-admin/storage': {getStorage: ()=>({})},
	'firebase-admin/messaging': {getMessaging: ()=>({})},
	'cloudinary': {config: ()=>{}},
	'moment-timezone': function(){},
	'memory-cache': {get: ()=>null, put: ()=>{}}
};
const origLoad = Module._load;
Module._load = function(request){
	if(Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
	return origLoad.apply(this, arguments);
};
const origLog = console.log;
console.log = ()=>{};
const {Fire} = require(path.join(__dirname, '../cloud/auto.js'));

(async ()=>{
	let failed = 0;
	const run = async (name, fn)=>{
		try{ await fn(); origLog('ok -', name); }
		catch(e){ failed++; origLog('NOT OK -', name); origLog('  ', e && e.stack || e); }
	};
	let unhandled = [];
	process.on('unhandledRejection', e=>unhandled.push(e));

	await run('collection get resolves a list', async ()=>{
		failRead = false;
		let list = await new Fire('items').get();
		assert.strictEqual(list.length, 0);
	});
	await run('collection read error rejects with the DB error', async ()=>{
		failRead = true;
		let hang = new Promise(r=>setTimeout(()=>r('HUNG'), 1000));
		let err = await Promise.race([new Fire('items').get().then(()=>null, e=>e), hang]);
		assert.notStrictEqual(err, 'HUNG', 'Fire.get() never settled');
		assert.ok(err && err.message == 'read denied', 'expected rejection');
		await new Promise(r=>setImmediate(r));
		assert.ok(!unhandled.some(e=>e instanceof ReferenceError), 'no ReferenceError');
	});
	origLog((2 - failed) + '/2 passed');
	process.exit(failed ? 1 : 0);
})();
