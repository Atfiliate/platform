/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Keyboard test', () => {
	describe('Smoke test', () => {
		it('Should have keyboard plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('keyboard')).equals('function');
		});

		it('Should have keyboard section in controls', () => {
			expect(typeof Jodit.defaultOptions.controls.keyboard).equals(
				'object'
			);
		});

		it('Should have keyboard button in buttons list', () => {
			expect(getButton('keyboard', getJodit())).is.not.null;
		});
	});

	describe('Check functionality', () => {
		describe('Click on some symbol key', () => {
			it('Should insert this symbol', () => {
				const editor = getJodit();
				clickButton('keyboard', editor);
				const dialog = getOpenedDialog(editor);
				simulateEvent(
					['mousedown', 'mouseup'],
					dialog.querySelector('[key="f"]')
				);
				expect(editor.value).eq('<p>f</p>');
			});
		});

		describe('Click Shift key', () => {
			it('Should change casing for letters and change all chars to second argument', () => {
				const editor = getJodit();
				clickButton('keyboard', editor);
				const dialog = getOpenedDialog(editor);
				expect(dialog.querySelector('[key="1"]')).is.not.null;
				expect(dialog.querySelector('[key="f"]')).is.not.null;
				simulateEvent(
					['mousedown', 'mouseup'],
					dialog.querySelector('[key="Shift"]')
				);
				expect(dialog.querySelector('[key="f"]')).is.null;
				expect(dialog.querySelector('[key="F"]')).is.not.null;
				expect(dialog.querySelector('[key="1"]')).is.null;
				expect(dialog.querySelector('[key="!"]')).is.not.null;
			});

			describe('After click another button', () => {
				it('Should change all back', () => {
					const editor = getJodit();
					clickButton('keyboard', editor);
					const dialog = getOpenedDialog(editor);
					expect(dialog.querySelector('[key="1"]')).is.not.null;
					expect(dialog.querySelector('[key="f"]')).is.not.null;
					simulateEvent(
						['mousedown', 'mouseup'],
						dialog.querySelector('[key="Shift"]')
					);
					expect(dialog.querySelector('[key="f"]')).is.null;
					expect(dialog.querySelector('[key="F"]')).is.not.null;
					expect(dialog.querySelector('[key="1"]')).is.null;
					expect(dialog.querySelector('[key="!"]')).is.not.null;

					simulateEvent(
						['mousedown', 'mouseup'],
						dialog.querySelector('[key="F"]')
					);

					expect(dialog.querySelector('[key="f"]')).is.not.null;
					expect(dialog.querySelector('[key="F"]')).is.null;
					expect(dialog.querySelector('[key="1"]')).is.not.null;
					expect(dialog.querySelector('[key="!"]')).is.null;

					expect(editor.value).eq('<p>F</p>');
				});
			});
		});

		describe('Click Caps key', () => {
			it('Should change casing only for letters', () => {
				const editor = getJodit();
				clickButton('keyboard', editor);
				const dialog = getOpenedDialog(editor);
				expect(dialog.querySelector('[key="1"]')).is.not.null;
				expect(dialog.querySelector('[key="f"]')).is.not.null;
				simulateEvent(
					['mousedown', 'mouseup'],
					dialog.querySelector('[key="Caps"]')
				);
				expect(dialog.querySelector('[key="f"]')).is.null;
				expect(dialog.querySelector('[key="F"]')).is.not.null;
				expect(dialog.querySelector('[key="1"]')).is.not.null;
				expect(dialog.querySelector('[key="!"]')).is.null;
			});
		});

		describe('Click Options key', () => {
			it('Should change all buttons to third value', () => {
				const editor = getJodit();
				clickButton('keyboard', editor);
				const dialog = getOpenedDialog(editor);
				expect(dialog.querySelector('[key="1"]')).is.not.null;
				simulateEvent(
					['mousedown', 'mouseup'],
					dialog.querySelector('[key="Options"]')
				);
				expect(dialog.querySelector('[key="1"]')).is.null;
				expect(dialog.querySelector('[key="§"]')).is.not.null;
			});
		});
	});

	describe('Layout switcher test', () => {
		describe('Disable layout switcher', () => {
			it('Should do not show layout switcher', () => {
				const editor = getJodit({
					keyboard: {
						showLayoutSwitcher: false
					}
				});

				clickButton('keyboard', editor);

				const dialog = getOpenedDialog(editor);
				expect(dialog.component.dialogbox_header.innerText).eq('');
			});
		});

		describe('Enable layout switcher', () => {
			it('Should show layout switcher', () => {
				const editor = getJodit({
					keyboard: {
						showLayoutSwitcher: true
					}
				});

				clickButton('keyboard', editor);

				const dialog = getOpenedDialog(editor);
				expect(dialog.component.dialogbox_header.textContent).not.eq(
					''
				);
			});
		});

		describe('Change layout', () => {
			it('Should show layout switcher', () => {
				const editor = getJodit({
					keyboard: {
						showLayoutSwitcher: true
					}
				});

				clickButton('keyboard', editor);

				const dialog = getOpenedDialog(editor);
				const text = dialog.innerText;
				const switcher = dialog.querySelector('select');
				switcher.value = 'ru';
				simulateEvent('change', switcher);
				expect(text).does.not.eq(dialog.innerText);
			});
		});
	});
});
