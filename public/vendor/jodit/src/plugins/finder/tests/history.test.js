/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Finder history test', () => {
	let editor;

	beforeEach(() => {
		editor = getJodit({
			observer: {
				timeout: 0
			},
			uploader: {
				url: 'https://xdsoft.net/jodit/connector/index.php?action=upload'
			},
			filebrowser: {
				ajax: {
					url: 'https://xdsoft.net/jodit/connector/index.php'
				}
			}
		});
		editor.storage.clear();
		editor.filebrowser.storage.clear();
	});

	describe('Home button', () => {
		it('Should have home button', async () => {
			const finder = editor.filebrowser;
			finder.open();
			await delay(100);

			expect(getButton('home', finder.dialog)).is.not.null;
			expect(finder.panel.items.elements.length).eq(4);

			simulateEvent(
				'click',
				finder.dialog.querySelector('.jodit-ui-browser-folder')
			);
			await delay(100);
			expect(finder.panel.items.elements.length).eq(2);

			clickButton('home', finder.dialog);
			await delay(100);
			expect(finder.panel.items.elements.length).eq(4);
		});

		describe('Click Home in favorites list', () => {
			it('Should open home list', async () => {
				const finder = editor.filebrowser;
				finder.open();
				await delay(100);

				const favoritesButton =
					finder.panel.sidebar.getElm('favorites');
				const favoriteButton =
					finder.panel.items.elements[0].getElm('heart');

				simulateEvent('click', favoriteButton);
				simulateEvent('click', favoritesButton);
				await delay(100);

				expect(finder.panel.items.elements.length).eq(1);

				clickButton('home', finder.dialog);
				await delay(100);

				expect(finder.panel.items.elements.length).eq(4);
			});
		});
	});
});
