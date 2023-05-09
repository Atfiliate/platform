/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
describe('Emoji plugin with autocomplete', () => {
	describe('With enableAutoComplete = false', () => {
		it('Should not register autocomplete source', async () => {
			const editor = getJodit({
				emoji: {
					enableAutoComplete: false
				}
			});

			editor.s.insertHTML(':sponge');

			simulateEvent('keydown', editor.editor);
			const popup = getOpenedPopup(editor);

			expect(popup).is.null;
		});
	});

	describe('With enableAutoComplete = true', () => {
		it('Should register autocomplete source', async () => {
			const editor = getJodit();

			editor.s.insertHTML(':sponge');

			await delay(350);
			simulateEvent('keydown', editor.editor);
			await delay(350);

			const popup = getOpenedPopup(editor);
			expect(popup).is.not.null;

			expect(popup.innerText).equals('🧽 sponge');

			simulateEvent(
				'click',
				popup.querySelector('.jodit-autocomplete-item')
			);

			expect(editor.value).equals('<p>🧽&nbsp;</p>');
		});
	});
});
