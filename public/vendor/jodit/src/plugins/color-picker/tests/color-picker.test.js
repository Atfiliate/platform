/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Color Picker test', () => {
	describe('Smoke test', () => {
		it('Should have color-picker plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('color-picker')).equals('function');
		});

		it('Should have input in default-color-picker popup', () => {
			const editor = getJodit();
			clickButton('brush', editor);

			const popup = getOpenedPopup(editor);

			expect(popup.querySelector('input[type=text]')).is.not.null;
		});
	});

	describe('Click on colored element', () => {
		it('Should set this color to input', () => {
			const editor = getJodit();
			editor.value =
				'<p><span style="background-color: #1e7e34">|test|</span></p>';
			setCursorToChar(editor);
			clickButton('brush', editor);

			const popup = getOpenedPopup(editor),
				input = popup.querySelector('input[type=text]');

			expect(input.value).eq('#1E7E34');
		});
	});

	describe('Click on input element', () => {
		it('Should open big colorPicker', () => {
			const editor = getJodit();
			editor.value =
				'<p><span style="background-color: #1e7e34">|test|</span></p>';
			setCursorToChar(editor);
			clickButton('brush', editor);

			const popup = getOpenedPopup(editor),
				input = popup.querySelector('input[type=text]');

			input.click();
			expect(getOpenedPopup(editor)).does.not.eq(popup);
		});
	});
});
