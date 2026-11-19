// Run: node test/shell.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const shell = require('../cloud/shell.js');

const tests = [];
const test = (name, fn)=>tests.push({name, fn});
const proj = (components)=>({component: Object.fromEntries(Object.entries(components).map(([k, code])=>[k, {code}]))});
const quiet = (fn)=>{ let w = console.warn; let out = []; console.warn = (...a)=>out.push(a.join(' ')); try{ fn(); }finally{ console.warn = w; } return out; };

test('no site project / no site.json -> shell 1, config untouched', ()=>{
	for(let p of [undefined, {}, proj({'header.html': 'x'})]){
		let site = shell.read(p);
		assert.deepStrictEqual(site, {});
		let config = {title: 'Env'};
		shell.brand(config, site);
		assert.deepStrictEqual(config, {title: 'Env'});
		assert.deepStrictEqual(shell.locals(p, site), {version: 1, base: shell.SHARED_BASE, manifest: null, header: null, integrations: {}});
	}
});

test('invalid site.json -> {} with one named warning', ()=>{
	shell.resetWarnings();
	let out = quiet(()=>{ shell.read(proj({'site.json': '{bad'})); shell.read(proj({'site.json': '{bad'})); });
	assert.strictEqual(out.length, 1);
	assert.ok(out[0].startsWith('INVALID_SITE_JSON'));
});

test('shell 1 site.json does not change branding', ()=>{
	let site = shell.read(proj({'site.json': JSON.stringify({platform: {shell: 1}, brand: {name: 'X'}})}));
	let config = {title: 'Env'};
	shell.brand(config, site);
	assert.strictEqual(config.title, 'Env');
	assert.strictEqual(shell.locals(undefined, site).version, 1);
});

test('shell 2 applies brand/theme and local core base', ()=>{
	let p = proj({'site.json': JSON.stringify({platform: {shell: 2}, brand: {name: 'Site', favicon: '/f.png', description: 'd'}, theme: {primary: 'red', accent: 'grey'}}), 'manifest.json': '{}'});
	let site = shell.read(p);
	let config = shell.brand({title: 'Env', color: {primary: 'blue', customPrimary: {}}}, site);
	assert.strictEqual(config.title, 'Site');
	assert.strictEqual(config.favicon, '/f.png');
	assert.strictEqual(config.description, 'd');
	assert.deepStrictEqual(config.color, {primary: 'red', customPrimary: {}, secondary: 'grey'});
	assert.deepStrictEqual(shell.locals(p, site), {version: 2, base: '/core/', manifest: '/component/manifest.json', header: null, integrations: {}});
	assert.deepStrictEqual(config.site, {brand: {name: 'Site', logo: '', tagline: ''}, nav: []});
});

test('bundled core client has every file it references and no shared-remote shell URLs', ()=>{
	let dir = path.join(__dirname, '..', 'public', 'core');
	let files = fs.readdirSync(dir);
	for(let f of ['app.js', 'services.js', 'directives.js', 'site.css', 'project-ctrl.js', 'login.dialog'])
		assert.ok(files.includes(f), 'missing ' + f);
	for(let f of files){
		let s = fs.readFileSync(path.join(dir, f), 'utf8');
		assert.ok(!s.includes('iZTQIVnPzPW7b2CzNUmO'), f + ' still loads the shared remote copy');
		for(let m of s.matchAll(/['"`]\/core\/([A-Za-z0-9_.\-]+)['"`]/g))
			assert.ok(files.includes(m[1]), f + ' references missing /core/' + m[1]);
	}
});

test('templates: shell 1 keeps shared URLs, shell 2 uses /core/', ()=>{
	let ejs;
	try{ ejs = require('ejs'); }catch(e){ console.log('  (skipped: ejs not installed)'); return; }
	let views = path.join(__dirname, '..', 'views', 'partials');
	let render = (f, shellLocals)=>ejs.render(fs.readFileSync(path.join(views, f), 'utf8'), {config: {title: 't'}, ...(shellLocals ? {shell: shellLocals} : {})});
	for(let s1 of [null, shell.locals(undefined, {})]){
		let h = render('head.ejs', s1), sc = render('scripts.ejs', s1);
		assert.ok(h.includes(shell.SHARED_BASE + 'site.css'));
		assert.ok(sc.includes('https:' + shell.SHARED_BASE + 'app.js'));
		assert.ok(!sc.includes('"/core/'));
	}
	let s2 = {version: 2, base: '/core/', manifest: '/component/manifest.json', header: null, integrations: {}};
	let h = render('head.ejs', s2), sc = render('scripts.ejs', s2);
	assert.ok(h.includes('href="/core/site.css"'));
	assert.ok(h.includes('<link rel="manifest" href="/component/manifest.json">'));
	for(let f of ['app.js', 'services.js', 'directives.js'])
		assert.ok(sc.includes(`src="/core/${f}"`), f);
	assert.ok(!sc.includes('iZTQIVnPzPW7b2CzNUmO'));
});

test('shell 2 nav, integrations and default header', ()=>{
	shell.resetWarnings();
	let site = {platform: {shell: 2}, header: 'default', brand: {name: 'S', logo: '/l.png', tagline: 'T'},
		nav: [{label: 'A', href: '/a', auth: true}, {label: 'B', href: 'javascript:x'}, {href: '/c'}, {label: 'D', href: 'https://d.test/'}],
		integrations: {clarity: 'abc123', xPixel: "x');alert(1)//"}};
	let out = quiet(()=>{
		let config = shell.brand({}, site);
		assert.deepStrictEqual(config.site.nav, [{label: 'A', href: '/a', auth: true}, {label: 'D', href: 'https://d.test/', auth: false}]);
		assert.deepStrictEqual(config.site.brand, {name: 'S', logo: '/l.png', tagline: 'T'});
		let l = shell.locals(undefined, site);
		assert.strictEqual(l.header, '/core/header.html');
		assert.deepStrictEqual(l.integrations, {clarity: 'abc123'});
	});
	assert.ok(out.some(o=>o.startsWith('INVALID_INTEGRATION xPixel')));
	let noFlag = shell.locals(undefined, {platform: {shell: 2}});
	assert.strictEqual(noFlag.header, null);
	let v1 = shell.locals(undefined, {platform: {shell: 1}, header: 'default', integrations: {clarity: 'abc'}});
	assert.strictEqual(v1.header, null);
	assert.deepStrictEqual(v1.integrations, {});
});

test('templates: shell 2 header include and integration tags', ()=>{
	let ejs;
	try{ ejs = require('ejs'); }catch(e){ console.log('  (skipped: ejs not installed)'); return; }
	let views = path.join(__dirname, '..', 'views');
	let s2 = {version: 2, base: '/core/', manifest: null, header: '/core/header.html', integrations: {clarity: 'abc123', xPixel: 'px1'}};
	let page = ejs.render(fs.readFileSync(path.join(views, 'pages', 'index.ejs'), 'utf8'), {config: {title: 't'}, shell: s2}, {filename: path.join(views, 'pages', 'index.ejs')});
	assert.ok(page.includes(`<div ng-include="'/core/header.html'"></div>`));
	assert.ok(page.includes('"clarity","script","abc123"'));
	assert.ok(page.includes("twq('config','px1')"));
	let plain = ejs.render(fs.readFileSync(path.join(views, 'pages', 'index.ejs'), 'utf8'), {config: {title: 't'}}, {filename: path.join(views, 'pages', 'index.ejs')});
	assert.ok(plain.includes(`<div ng-include="tools.component('header')"></div>`));
	assert.ok(!plain.includes('clarity.ms') && !plain.includes('twq('));
	assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', 'core', 'header.html')));
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
