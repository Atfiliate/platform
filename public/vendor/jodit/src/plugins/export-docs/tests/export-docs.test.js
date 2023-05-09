/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('export-docs test', () => {
	describe('Smoke test', () => {
		it('Should have export-docs plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('export-docs')).equals('function');
		});

		it('Should have exportDocs section in controls', () => {
			expect(typeof Jodit.defaultOptions.controls.exportDocs).equals(
				'object'
			);
		});

		it('Should have exportDocs button in buttons list', () => {
			expect(getButton('exportDocs', getJodit())).is.not.null;
		});
	});

	describe('Check functionality', () => {
		let editor, style;

		beforeEach(() => {
			editor = getJodit({
				filebrowser: {
					ajax: {
						url: 'https://xdsoft.net/jodit/connector/index.php',
						method: 'GET'
					}
				}
			});
			style = editor.createInside.element('style');
			style.textContent =
				'.short-test-case{color: red;text-decoration: underline;}';
			editor.ed.body.appendChild(style);
			editor.value =
				'<p>test|<img alt="test" src="/jodit/build/images/artio.jpg" style="width:300px;height: 169px;float: right;"></p>' +
				'<div style="page-break-before:always"></div>' +
				'<p class="short-test-case">test</p>';
			setCursorToChar(editor);
			Jodit.modules.Ajax.log = [];
		});

		afterEach(() => {
			style.remove();
			editor.destruct();
		});

		function checkRequests() {
			expect(Jodit.modules.Ajax.log.length).eq(1);

			Jodit.modules.Ajax.log.forEach((req) => {
				const result =
					'<style>.jodit,.jodit *,.jodit-container,.jodit-container * { box-sizing: border-box; }\n.jodit-wysiwyg [contenteditable="false"] { cursor: default; }\n[data-jodit-page-break] { display: flex; height: 24px; box-sizing: border-box; align-items: center; justify-content: center; border: 1px dashed rgb(204, 204, 204); font-size: 12px; break-before: page; text-transform: uppercase; }\n.short-test-case { color: red; text-decoration: underline; }\n</style><p>test<img alt="test" src="http://localhost:2001/jodit/build/images/artio.jpg" style="width:300px;height: 169px;float: right;" width="300px" height="169px"></p><div style="page-break-before: always"></div><p class="short-test-case">test</p>';

				const real = req.data.html
					.replace(
						/(localhost|127\.0\.0\.1):[0-9]+/,
						'localhost:2001'
					)
					.replace(/#dadada/g, 'rgb(204, 204, 204)');

				for (let s in result) {
					if (result[s] !== real[s]) {
						console.log('result', result.substring(s - 30, s + 30));
						console.log('real', real.substring(s - 30, s + 30));
						break;
					}
				}

				expect(real).eq(result);
			});
		}

		describe('Click exportDocs button', () => {
			describe('exportToPDF', () => {
				it('Should send css and HTML to the server', () => {
					clickTrigger('exportDocs', editor);
					const list = getOpenedPopup(editor);
					clickButton('exportToPdf', list);
					checkRequests();
				});
			});

			describe('Exec command exportToPDF', () => {
				it('Should send css and HTML to the server', () => {
					editor.execCommand('exportToPDF');
					checkRequests();
				});
			});
		});
	});
});
