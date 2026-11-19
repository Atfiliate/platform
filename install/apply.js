#!/usr/bin/env node
// First install for a new site. Runs where the app's env is set (e.g. a one-off
// dyno: `heroku run node install/apply.js`), using env config + googleJson.
//
//   node install/apply.js                         dry run: lists every step and missing env
//   node install/apply.js --apply                 create what is missing (never overwrites)
//     --root-email <email> | --root-uid <uid>     make that account root (first root role)
//     --site-from <file.json>                     seed dev/site from an export instead of install/site
//     --title <name> --system-email <address> [--environment beta|production]
//                                                 first values for admin/settings (else set them in the admin tabs)
//     --rules                                     release install/firestore.rules (only when the
//                                                 project has no rules yet, unless --replace-rules)
//   node install/apply.js export --out <file>     save this site's dev/site (cloud + components)
//
// Output lists names only; env and data values are never printed.
const fs = require('fs');
const path = require('path');
const installer = require('./installer.js');

function arg(name){
	let i = process.argv.indexOf(name);
	return i == -1 ? null : (process.argv[i + 1] || null);
}
const has = (name)=>process.argv.includes(name);

function firebaseApp(){
	const {getApps, initializeApp, cert} = require('firebase-admin/app');
	if(!getApps().length){
		let config = JSON.parse(process.env.config);
		initializeApp({projectId: config.firebase.projectId, credential: cert(JSON.parse(process.env.googleJson))});
	}
}

function store(db){
	return {
		get: p=>db.doc(p).get().then(s=>s.exists ? s.data() : null),
		set: (p, data, o)=>db.doc(p).set(data, {merge: !!(o && o.merge)}),
		query: (col, wheres)=>{
			let q = db.collection(col);
			(wheres || []).forEach(w=>{ q = q.where(...w); });
			return q.limit(20).get().then(qs=>qs.docs.map(d=>({id: d.id, data: d.data()})));
		}
	};
}

async function main(){
	let env = process.env;
	let envResult = installer.checkEnv(env);
	envResult.errors.concat(envResult.warnings).forEach(e=>console.log(`${envResult.errors.includes(e) ? 'ERROR' : 'warn '} ${e.code} ${e.name}: ${e.message}`));
	if(envResult.errors.length){
		console.log('Stopping: set the required env above first.');
		process.exitCode = 2;
		return;
	}
	firebaseApp();
	const {getFirestore} = require('firebase-admin/firestore');
	let db = getFirestore();

	if(process.argv[2] == 'export'){
		let out = arg('--out');
		if(!out) throw new Error('export needs --out <file>');
		let s = await db.doc('dev/site').get();
		if(!s.exists) throw new Error('dev/site not found');
		let pkg = installer.sitePackage(s.data());
		fs.writeFileSync(out, JSON.stringify(pkg, null, 1));
		console.log(`exported dev/site: ${Object.keys(pkg.cloud).length} cloud, ${Object.keys(pkg.component).length} components -> ${out}`);
		return;
	}

	let rootUid = arg('--root-uid');
	let rootEmail = arg('--root-email');
	if(!rootUid && rootEmail)
		rootUid = (await require('firebase-admin/auth').getAuth().getUserByEmail(rootEmail)).uid;
	let from = arg('--site-from');
	let siteExport = from ? JSON.parse(fs.readFileSync(from, 'utf8')) : null;

	let result = await installer.run({env, store: store(db), apply: has('--apply'), rootUid, siteExport,
		site: {title: arg('--title'), systemEmail: arg('--system-email'), environment: arg('--environment')}});
	result.steps.forEach(s=>console.log(`${s.action.padEnd(8)} ${s.id.padEnd(14)} ${s.detail}`));

	if(has('--rules')){
		let source = fs.readFileSync(path.join(__dirname, 'firestore.rules'), 'utf8');
		let rules = require('firebase-admin/security-rules').getSecurityRules();
		let current = await rules.getFirestoreRuleset().catch(()=>null);
		if(current && !has('--replace-rules'))
			console.log('skip     rules          RULES_EXIST: this project already has rules; merge install/firestore.rules by hand or pass --replace-rules');
		else if(!has('--apply'))
			console.log('would    rules          release install/firestore.rules');
		else{
			let rs = await rules.releaseFirestoreRulesetFromSource(source);
			console.log(`released rules         ${rs.name}`);
		}
	}
	console.log(result.applied ? `applied ${result.writes} write(s); log in admin/install/log` : `dry run: ${result.writes} write(s) planned. Re-run with --apply.`);
}

main().catch(e=>{
	console.error('install failed:', e && e.message || e);
	process.exit(1);
});
