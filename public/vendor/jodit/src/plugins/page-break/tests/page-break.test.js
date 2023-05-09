/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('page-break test', () => {
	describe('Smoke test', () => {
		it('Should have page-break plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('page-break')).equals('function');
		});

		it('Should have page-break section in controls', () => {
			expect(typeof Jodit.defaultOptions.controls.pageBreak).equals(
				'object'
			);
		});

		it('Should have page-break button in buttons list', () => {
			expect(getButton('pageBreak', getJodit())).is.not.null;
		});
	});

	describe('Check functionality', () => {
		let editor;

		beforeEach(() => {
			editor = getJodit();
			editor.value = '<p>test|</p>';
			setCursorToChar(editor);
		});

		afterEach(() => {
			editor.destruct();
		});

		describe('Click pageBreak button', () => {
			it('Should add div[style] element', () => {
				clickButton('pageBreak', editor);
				expect(sortAttributes(editor.value)).eq(
					'<p>test</p><div style="page-break-before:always"></div>'
				);
			});

			describe('Inside WYSIWYG', () => {
				it('Should be another div box', () => {
					clickButton('pageBreak', editor);
					expect(sortAttributes(editor.getNativeEditorValue())).eq(
						'<p>test</p><div contenteditable="false" data-jodit-page-break="true">Page break</div>'
					);
				});

				describe('Set page-break-before:always in value', () => {
					it('Should be another div box', () => {
						editor.value =
							'<p>test</p>' +
							'<div style="page-break-before:always"></div>' +
							'<p>test</p>';

						expect(
							sortAttributes(editor.getNativeEditorValue())
						).eq(
							'<p>test</p>' +
								'<div contenteditable="false" data-jodit-page-break="true" style="page-break-before:always">Page break</div>' +
								'<p>test</p>'
						);
					});
				});
			});

			describe('Change separator', () => {
				it('Should add div[style] element', () => {
					editor = getJodit({
						pageBreak: {
							separator:
								'<div style="color:red;page-break-before: always"></div>'
						}
					});
					editor.value = '<p>test|</p>';
					setCursorToChar(editor);
					clickButton('pageBreak', editor);
					expect(sortAttributes(editor.value)).eq(
						'<p>test</p><div style="color:red;page-break-before:always"></div>'
					);
				});
			});
		});
	});
});
