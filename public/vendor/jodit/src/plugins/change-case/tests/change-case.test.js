/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Change Case test', () => {
	describe('Smoke test', () => {
		it('Should have change-case plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('change-case')).equals('function');
		});

		it('Should have change-case section in controls', () => {
			expect(typeof Jodit.defaultOptions.controls.changeCase).equals(
				'object'
			);
		});

		it('Should have change-case button in buttons list', () => {
			expect(getButton('changeCase', getJodit())).is.not.null;
		});
	});

	describe('Press button', () => {
		describe('First time', () => {
			it('Should open popup list', () => {
				const editor = getJodit();
				clickButton('changeCase', editor);
				expect(getOpenedPopup(editor)).is.not.null;
			});
		});

		describe('Second time', () => {
			it('Should apply previous mode', () => {
				const editor = getJodit();
				editor.value = '<p>test |CASE| test</p>';
				setCursorToChar(editor);

				clickButton('changeCase', editor);
				const popup = getOpenedPopup(editor);

				clickButton('lowercase', popup);
				expect(editor.value).eq('<p>test case test</p>');

				editor.value = '<p>test |CASE| test</p>';
				setCursorToChar(editor);
				clickButton('changeCase', editor);
				expect(editor.value).eq('<p>test case test</p>');
			});
		});
	});
});
