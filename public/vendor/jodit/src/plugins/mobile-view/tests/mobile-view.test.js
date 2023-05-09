/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Mobile view test', () => {
	describe('Smoke test', () => {
		it('Should have Mobile view plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('mobile-view')).equals('function');
		});

		it('Should have Mobile view section in controls', () => {
			expect(typeof Jodit.defaultOptions.controls.mobileView).equals(
				'object'
			);
		});

		it('Should have mobileView button in buttons list', () => {
			expect(getButton('mobileView', getJodit())).is.not.null;
		});
	});

	describe('Check functionality', () => {
		describe('Click on mobile view button', () => {
			let editor;

			beforeEach(() => {
				getBox().style.width = '800px';
				editor = getJodit({
					buttons: ['mobileView', 'source'],
					toolbarAdaptive: false
				});
			});

			it('Should open list', () => {
				expect(editor.workplace.clientWidth).eq(798);
				clickTrigger('mobileView', editor);
				expect(getOpenedPopup(editor)).is.not.null;
			});

			describe('Click list item', () => {
				it('Should change workplace size', () => {
					expect(editor.workplace.clientWidth).eq(798);

					clickTrigger('mobileView', editor);
					clickButton('iPhone_SE', getOpenedPopup(editor));

					expect(editor.workplace.clientWidth).eq(375);
				});
			});

			describe('Second click', () => {
				it('Should restore default workplace size', () => {
					clickTrigger('mobileView', editor);
					clickButton('iPhone_SE', getOpenedPopup(editor));
					expect(editor.workplace.clientWidth).eq(375);

					clickButton('mobileView', editor);

					expect(editor.workplace.clientWidth).eq(798);
				});

				describe('Click again', () => {
					it('Should again change workplace size', () => {
						clickTrigger('mobileView', editor);
						clickButton('iPhone_SE', getOpenedPopup(editor));
						expect(editor.workplace.clientWidth).eq(375);

						clickButton('mobileView', editor);

						expect(editor.workplace.clientWidth).eq(798);

						clickButton('mobileView', editor);

						expect(editor.workplace.clientWidth).eq(375);
					});
				});
			});

			describe('Set source mode', () => {
				it('Should restore default workplace size', () => {
					clickTrigger('mobileView', editor);
					clickButton('iPhone_SE', getOpenedPopup(editor));
					expect(editor.workplace.clientWidth).eq(375);

					clickButton('source', editor);

					expect(editor.workplace.clientWidth).eq(798);

					clickButton('source', editor);

					expect(editor.workplace.clientWidth).eq(798);
				});
			});
		});
	});
});
