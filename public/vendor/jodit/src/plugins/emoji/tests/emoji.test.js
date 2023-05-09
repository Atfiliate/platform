/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Emoji test', () => {
	describe('Smoke test', () => {
		it('Should have emoji plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('emoji')).equals('function');
		});

		it('Should have emoji section in controls', () => {
			expect(typeof Jodit.defaultOptions.controls.emoji).equals('object');
		});

		it('Should have emoji button in buttons list', () => {
			expect(getButton('emoji', getJodit())).is.not.null;
		});
	});

	describe('Data option', () => {
		describe('return object', () => {
			it('Should replace default emoji list', async () => {
				const editor = getJodit({
					emoji: {
						data: () => ({
							categories: ['One', 'Two'],
							emoji: [
								{
									e: '😀',
									d: 'grinning face',
									c: 0,
									a: ['grinning'],
									t: ['smile', 'happy']
								},
								{
									e: '😂',
									d: 'face with tears of joy',
									c: 1,
									a: ['joy'],
									t: ['tears']
								}
							]
						})
					}
				});

				await delay(350);
				clickButton('emoji', editor);
				await delay(350);
				const popup = getOpenedPopup(editor);

				expect(popup.innerText).equals('One\n😀\nTwo\n😂');
			});
		});

		describe('return promise', () => {
			it('Should replace default emoji list', async () => {
				const editor = getJodit({
					emoji: {
						data: () =>
							new Promise((resolve) => {
								resolve({
									categories: ['One', 'Two'],
									emoji: [
										{
											e: '😀',
											d: 'grinning face',
											c: 0,
											a: ['grinning'],
											t: ['smile', 'happy']
										},
										{
											e: '😂',
											d: 'face with tears of joy',
											c: 1,
											a: ['joy'],
											t: ['tears']
										}
									]
								});
							})
					}
				});

				await delay(350);
				clickButton('emoji', editor);
				await delay(350);

				const popup = getOpenedPopup(editor);

				expect(popup.innerText).equals('One\n😀\nTwo\n😂');
			});
		});
	});

	describe('On select', () => {
		it('should save in local storage recent used', async () => {
			const editor = getJodit({
				emoji: {
					data: () => ({
						categories: ['One', 'Two'],
						emoji: [
							{
								e: '😀',
								d: 'grinning face',
								c: 0,
								a: ['grinning'],
								t: ['smile', 'happy']
							},
							{
								e: '😂',
								d: 'face with tears of joy',
								c: 1,
								a: ['joy'],
								t: ['tears']
							}
						]
					})
				}
			});
			editor.storage.clear();
			await delay(350);
			clickButton('emoji', editor);
			await delay(350);
			const popup = getOpenedPopup(editor);
			expect(popup.innerText).equals('One\n😀\nTwo\n😂');

			simulateEvent(
				'mousedown',
				popup.querySelector('.jodit-emoji__emoji')
			);
			expect(getOpenedPopup(editor)).is.null;

			clickButton('emoji', editor);
			expect(getOpenedPopup(editor).innerText).equals(
				'😀\nOne\n😀\nTwo\n😂'
			);
		});
	});

	describe('On scroll', () => {
		it('should change active category', async () => {
			const editor = getJodit({
				observer: {
					timeout: 0
				}
			});

			clickButton('emoji', editor);

			await delay(350);

			const popup = getOpenedPopup(editor);
			const categories = Array.from(
				popup.querySelectorAll('.jodit-emoji__category')
			);

			let active = popup.querySelector(
				'.jodit-emoji__category_active_true'
			);

			expect(categories.indexOf(active)).equals(0);

			await delay(250);
			popup.querySelector('.jodit-emoji__emojis').scrollTo(0, 2500);
			await delay(250);

			simulateEvent(
				'scroll',
				popup.querySelector('.jodit-emoji__emojis')
			);
			await delay(250);

			active = popup.querySelector('.jodit-emoji__category_active_true');
			expect(categories.indexOf(active)).equals(4);
		});

		describe('On click on some category', () => {
			it('should scroll to this category', async () => {
				const editor = getJodit({
					observer: {
						timeout: 0
					}
				});

				clickButton('emoji', editor);

				await delay(350);
				const popup = getOpenedPopup(editor);

				simulateEvent(
					'click',
					popup.querySelectorAll('.jodit-emoji__category')[3]
				);

				expect(
					popup.querySelector('.jodit-emoji__emojis').scrollTop
				).above(1850);
			});
		});
	});

	describe('On input inside filter', () => {
		it('should filter emoji', async () => {
			const editor = getJodit({
				observer: {
					timeout: 0
				}
			});

			clickButton('emoji', editor);

			await delay(350);
			const popup = getOpenedPopup(editor);
			const input = popup.querySelector('input');
			input.value = 'rofl';
			simulateEvent('input', input);

			expect(popup.innerText).equals('Smileys & Emotion\n🤣');
		});

		describe('After click on category', () => {
			it('should clear filter input', async () => {
				const editor = getJodit({
					observer: {
						timeout: 0
					}
				});

				clickButton('emoji', editor);

				await delay(350);
				const popup = getOpenedPopup(editor);
				const input = popup.querySelector('input');
				input.value = 'rofl';
				simulateEvent('input', input);

				simulateEvent(
					'click',
					popup.querySelectorAll('.jodit-emoji__category')[3]
				);
				expect(input.value).equals('');
			});
		});
	});
});
