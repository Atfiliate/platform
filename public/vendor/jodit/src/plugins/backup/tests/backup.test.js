/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Backup test', () => {
	describe('Smoke test', () => {
		it('Should have Backup plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('backup')).equals('function');
		});

		it('Should have backup section in controls', () => {
			expect(typeof Jodit.defaultOptions.controls.backup.restore).equals(
				'object'
			);
			expect(typeof Jodit.defaultOptions.controls.backup.store).equals(
				'object'
			);
		});

		it('Should have backup button in buttons list', () => {
			expect(getButton('restore', getJodit())).is.not.null;
		});
	});

	describe('On change', () => {
		describe('Every timout', () => {
			it('Should add new item in store', async () => {
				const editor = getJodit({
					observer: {
						timeout: 0
					},
					backup: {
						interval: 0.1
					}
				});

				editor.storage.clear();

				editor.value = '1';
				await delay(250);
				editor.value = '2';
				await delay(250);

				clickButton('restore', editor);

				await editor.async.requestIdlePromise();
				const dialog = getOpenedDialog(editor);
				expect(dialog.innerText).equals(
					'Restore\nCurrent\nLess minute\nLess minute\n\n2\n\nRemove all\nCancel\nOk'
				);
			});

			describe('Content was not change', () => {
				it('Should not add new item in store', async () => {
					const editor = getJodit({
						observer: {
							timeout: 0
						},
						backup: {
							interval: 0.1
						}
					});

					editor.storage.clear();

					editor.value = '1';
					await delay(250);
					editor.value = '1';
					await delay(250);

					clickButton('restore', editor);

					await editor.async.requestIdlePromise();
					const dialog = getOpenedDialog(editor);
					expect(dialog.innerText).equals(
						'Restore\nCurrent\nLess minute\n\n1\n\nRemove all\nCancel\nOk'
					);
				});
			});
		});

		describe('On press store button', () => {
			it('Should add new item in store without timeout', async () => {
				const editor = getJodit({
					backup: {
						interval: 0.1
					}
				});

				editor.storage.clear();

				editor.value = '2';
				clickTrigger('restore', editor);

				const popup = getOpenedPopup(editor);
				clickButton('store', popup);

				clickButton('restore', editor);

				await editor.async.requestIdlePromise();
				const dialog = getOpenedDialog(editor);
				expect(dialog.innerText).equals(
					'Restore\nCurrent\nCurrent\n\n2\n\nRemove all\nCancel\nOk'
				);
			});
		});

		describe('Select item in list', () => {
			it('Should change preview', async () => {
				const editor = getJodit({
					backup: {
						interval: 0.1
					}
				});

				editor.storage.clear();

				editor.value = '1';
				await delay(250);
				editor.value = '2';
				await delay(250);

				clickButton('restore', editor);

				await editor.async.requestIdlePromise();
				const dialog = getOpenedDialog(editor);

				await delay(250);
				simulateEvent(
					'click',
					dialog.querySelectorAll('.jodit-ui-backup-item')[2]
				);
				await delay(250);
				expect(dialog.innerText).equals(
					'Restore\nCurrent\nLess minute\nLess minute\n\n1\n\nRemove all\nCancel\nOk'
				);
			});

			describe('On focus', () => {
				it('Should work same way', async () => {
					const editor = getJodit({
						backup: {
							interval: 0.1
						}
					});

					editor.storage.clear();

					editor.value = '1';
					await delay(250);
					editor.value = '2';
					await delay(250);

					clickButton('restore', editor);

					await editor.async.requestIdlePromise();
					const dialog = getOpenedDialog(editor);

					simulateEvent(
						'focus',
						dialog.querySelectorAll('.jodit-ui-backup-item')[2]
					);
					await delay(250);

					expect(dialog.innerText).equals(
						'Restore\nCurrent\nLess minute\nLess minute\n\n1\n\nRemove all\nCancel\nOk'
					);
				});
			});
		});

		describe('On choose', () => {
			describe('On dblclick', () => {
				it('Should set value to editor', async () => {
					const editor = getJodit({
						backup: {
							interval: 0.1
						}
					});

					editor.storage.clear();

					editor.value = '1';
					await delay(250);
					editor.value = '2';
					await delay(250);

					expect(editor.value).equals('<p>2</p>');

					clickButton('restore', editor);

					await editor.async.requestIdlePromise();
					const dialog = getOpenedDialog(editor);
					simulateEvent(
						'dblclick',
						dialog.querySelectorAll('.jodit-ui-backup-item')[2]
					);
					expect(editor.value).equals('<p>1</p>');
				});
			});

			describe('On press enter', () => {
				it('Should set value to editor', async () => {
					const editor = getJodit({
						backup: {
							interval: 0.1
						}
					});

					editor.storage.clear();

					editor.value = '1';
					await delay(250);
					editor.value = '2';
					await delay(250);

					expect(editor.value).equals('<p>2</p>');

					clickButton('restore', editor);

					await editor.async.requestIdlePromise();
					const dialog = getOpenedDialog(editor),
						item = dialog.querySelectorAll(
							'.jodit-ui-backup-item'
						)[2];

					simulateEvent('focus', item);
					simulateEvent('keydown', 'Enter', item);

					expect(editor.value).equals('<p>1</p>');
				});
			});

			describe('On press Ok dialog button', () => {
				it('Should set value to editor', async () => {
					const editor = getJodit({
						backup: {
							interval: 0.1
						}
					});

					editor.storage.clear();

					editor.value = '1';
					await delay(250);
					editor.value = '2';
					await delay(250);

					expect(editor.value).equals('<p>2</p>');

					clickButton('restore', editor);

					await editor.async.requestIdlePromise();
					const dialog = getOpenedDialog(editor),
						item = dialog.querySelectorAll(
							'.jodit-ui-backup-item'
						)[2];

					simulateEvent('focus', item);
					clickButton('ok', dialog);

					expect(editor.value).equals('<p>1</p>');
				});
			});
		});

		describe('Clear all items', () => {
			it('Should clear storage and close dialog', async () => {
				const editor = getJodit({
					backup: {
						interval: 0.1
					}
				});

				editor.storage.clear();

				editor.value = '1';
				await delay(350);
				editor.value = '2';
				await delay(350);

				clickButton('restore', editor);

				await editor.async.requestIdlePromise();
				const dialog = getOpenedDialog(editor);
				expect(dialog.innerText).equals(
					'Restore\nCurrent\nLess minute\nLess minute\n\n2\n\nRemove all\nCancel\nOk'
				);

				clickButton('clear', dialog);

				const alert = getOpenedDialog(editor);
				clickButton('ok', alert);

				expect(getOpenedDialog(editor)).is.null;
				expect(editor.value).equals('<p>2</p>');

				clickButton('restore', editor);

				await editor.async.requestIdlePromise();
				const dialog2 = getOpenedDialog(editor);
				expect(dialog2.innerText).equals(
					'Restore\nCurrent\n\n2\n\nRemove all\nCancel\nOk'
				);
			});
		});
	});
});
