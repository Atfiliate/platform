/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Translate test', () => {
	describe('Smoke test', () => {
		it('Should have plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('translate')).equals('function');
		});

		it('Should have section in controls', () => {
			expect(typeof Jodit.defaultOptions.controls.translate).equals(
				'object'
			);
		});

		it('Should have button in buttons list', () => {
			expect(getButton('translate', getJodit())).is.not.null;
		});
	});

	describe('Check functionality', () => {
		let editor;
		beforeEach(() => {
			editor = getJodit({
				language: 'de',
				buttons: ['translate.translate'],
				toolbarAdaptive: false,
				translate: {
					provider: () => ({
						supportedLanguages() {
							return Promise.resolve({
								langs: {
									English: 'en',
									Russian: 'ru',
									German: 'de'
								}
							});
						},
						translate(text, from, to) {
							return Promise.resolve({
								text: 'translated-' + from + '-' + to
							});
						}
					})
				}
			});
		});

		describe('Click on translate button', () => {
			describe('Show dialog', () => {
				it('Should show languages from supportedLanguages', async () => {
					editor.value = '<p>text |перевод|</p>';
					setCursorToChar(editor);
					await editor.execCommand('translateOptions');
					await editor.async.requestIdlePromise();
					expect(
						getOpenedDialog(editor).textContent.replace(/\s+/g, '-')
					).equals(
						'-Translate-options-en-English-de-German-ru-Russian-en-English-de-German-ru-Russian-Abbrechen-Speichern-'
					);
				});
			});

			it('Should change workplace size', async () => {
				editor.value = '<p>text |перевод|</p>';
				setCursorToChar(editor);
				await editor.execCommand('translate');
				expect(editor.value).equals('<p>text translated-en-de</p>');
			});
		});
	});
});
