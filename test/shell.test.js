// Run: node test/shell.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const shell = require('../cloud/shell.js');

const tests = [];
const test = (name, fn)=>tests.push({name, fn});
const proj = (components)=>({component: Object.fromEntries(Object.entries(components).map(([k, code])=>[k, {code}]))});
const quiet = (fn)=>{ let w = console.warn; let out = []; console.warn = (...a)=>out.push(a.join(' ')); try{ fn(); }finally{ console.warn = w; } return out; };

const core = proj({'app.js': 'x', 'services.js': 'x', 'directives.js': 'x', 'site.css': 'x', 'header.html': 'x'});

test('no site project / no site.json -> shell 1, config untouched', ()=>{
	for(let p of [undefined, {}, proj({'header.html': 'x'})]){
		let site = shell.read(p);
		assert.deepStrictEqual(site, {});
		let config = {title: 'Env'};
		shell.brand(config, site);
		assert.deepStrictEqual(config, {title: 'Env'});
		assert.deepStrictEqual(shell.locals(p, site, core), {version: 1, base: shell.SHARED_BASE, manifest: null, header: null, head: ''});
	}
});

test('invalid site.json -> {} with one named warning', ()=>{
	shell.resetWarnings();
	let out = quiet(()=>{ shell.read(proj({'site.json': '{bad'})); shell.read(proj({'site.json': '{bad'})); });
	assert.strictEqual(out.length, 1);
	assert.ok(out[0].startsWith('INVALID_SITE_JSON'));
});

test('shell 1 site.json does not change branding or head', ()=>{
	let p = proj({'site.json': JSON.stringify({platform: {shell: 1}, brand: {name: 'X'}}), 'head.html': '<script>t</script>'});
	let site = shell.read(p);
	let config = {title: 'Env'};
	shell.brand(config, site);
	assert.strictEqual(config.title, 'Env');
	let l = shell.locals(p, site, core);
	assert.strictEqual(l.version, 1);
	assert.strictEqual(l.head, '');
});

test('shell 2 applies brand/theme and uses the Firestore core project base', ()=>{
	let p = proj({'site.json': JSON.stringify({platform: {shell: 2}, brand: {name: 'Site', favicon: '/f.png', description: 'd'}, theme: {primary: 'red', accent: 'grey'}}), 'manifest.json': '{}', 'head.html': '<script>t</script>'});
	let site = shell.read(p);
	let config = shell.brand({title: 'Env', color: {primary: 'blue', customPrimary: {}}}, site);
	assert.strictEqual(config.title, 'Site');
	assert.strictEqual(config.favicon, '/f.png');
	assert.strictEqual(config.description, 'd');
	assert.deepStrictEqual(config.color, {primary: 'red', customPrimary: {}, secondary: 'grey'});
	assert.deepStrictEqual(shell.locals(p, site, core), {version: 2, base: '/project/core/component/', manifest: '/component/manifest.json', header: null, head: '<script>t</script>'});
	assert.deepStrictEqual(config.site, {brand: {name: 'Site', logo: '', tagline: ''}, nav: []});
});

test('shell 2 without a core project -> MISSING_CORE_PROJECT once, shell 1', ()=>{
	shell.resetWarnings();
	let site = {platform: {shell: 2}};
	let out = quiet(()=>{
		for(let c of [undefined, {}, proj({'site.css': 'x'})])
			assert.deepStrictEqual(shell.locals(undefined, site, c), {version: 1, base: shell.SHARED_BASE, manifest: null, header: null, head: ''});
	});
	assert.strictEqual(out.length, 1);
	assert.ok(out[0].startsWith('MISSING_CORE_PROJECT'));
});

test('no bundled client files in the repo', ()=>{
	assert.ok(!fs.existsSync(path.join(__dirname, '..', 'public', 'core')));
	for(let f of ['views/pages/index.ejs', 'views/partials/head.ejs', 'views/partials/scripts.ejs', 'cloud/shell.js'])
		assert.ok(!/['"`]\/core\//.test(fs.readFileSync(path.join(__dirname, '..', f), 'utf8')), f + ' references /core/');
});

test('shell 2 nav and default header', ()=>{
	let site = {platform: {shell: 2}, header: 'default', brand: {name: 'S', logo: '/l.png', tagline: 'T'},
		nav: [{label: 'A', href: '/a', auth: true}, {label: 'B', href: 'javascript:x'}, {href: '/c'}, {label: 'D', href: 'https://d.test/'}]};
	let config = shell.brand({}, site);
	assert.deepStrictEqual(config.site.nav, [{label: 'A', href: '/a', auth: true}, {label: 'D', href: 'https://d.test/', auth: false}]);
	assert.deepStrictEqual(config.site.brand, {name: 'S', logo: '/l.png', tagline: 'T'});
	assert.strictEqual(shell.locals(undefined, site, core).header, '/project/core/component/header.html');
	assert.strictEqual(shell.locals(undefined, {platform: {shell: 2}}, core).header, null);
	assert.strictEqual(shell.locals(undefined, {platform: {shell: 1}, header: 'default'}, core).header, null);
});

test('templates: shell 1 keeps shared URLs; shell 2 uses the core project and site head.html', ()=>{
	let ejs;
	try{ ejs = require('ejs'); }catch(e){ console.log('  (skipped: ejs not installed)'); return; }
	let views = path.join(__dirname, '..', 'views');
	let render = (f, shellLocals)=>ejs.render(fs.readFileSync(path.join(views, f), 'utf8'), {config: {title: 't'}, ...(shellLocals ? {shell: shellLocals} : {})}, {filename: path.join(views, f)});
	for(let s1 of [null, shell.locals(undefined, {}, core)]){
		let h = render('partials/head.ejs', s1), sc = render('partials/scripts.ejs', s1);
		assert.ok(h.includes(shell.SHARED_BASE + 'site.css'));
		assert.ok(sc.includes('https:' + shell.SHARED_BASE + 'app.js'));
		assert.ok(!sc.includes('/project/core/'));
		assert.ok(!h.includes('<script>t</script>'));
	}
	let s2 = {version: 2, base: '/project/core/component/', manifest: '/component/manifest.json', header: '/project/core/component/header.html', head: '<script>t</script>'};
	let h = render('partials/head.ejs', s2), sc = render('partials/scripts.ejs', s2), page = render('pages/index.ejs', s2);
	assert.ok(h.includes('href="/project/core/component/site.css"'));
	assert.ok(h.includes('<link rel="manifest" href="/component/manifest.json">'));
	assert.strictEqual(h.split('<script>t</script>').length, 2);
	for(let f of ['app.js', 'services.js', 'directives.js'])
		assert.ok(sc.includes(`src="/project/core/component/${f}"`), f);
	assert.ok(page.includes(`<div ng-include="'/project/core/component/header.html'"></div>`));
	let plain = render('pages/index.ejs', null);
	assert.ok(plain.includes(`<div ng-include="tools.component('header')"></div>`));
});

(async()=>{
	let failed = 0;
	for(let t of tests){
		try{ await t.fn(); console.log('ok   ' + t.name); }
		catch(e){ failed++; console.log('FAIL ' + t.name + '\n     ' + e.message); }
	}
	console.log(`${tests.length - failed}/${tests.length} passed`);
	process.exit(failed ? 1 : 0);
})();
