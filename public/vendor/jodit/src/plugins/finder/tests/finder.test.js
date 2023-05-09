/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Finder test', () => {
	let editor,
		{ css, colorToHex } = Jodit.modules.Helpers;
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

	describe('Smoke test', () => {
		it('Should have finder plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('finder')).equals('function');
		});

		it('Should replace default filebrowser', () => {
			const finder = getJodit().filebrowser;
			expect(finder instanceof Jodit.modules.FileBrowserPro).is.true;
		});

		it('Should have open method', () => {
			const finder = getJodit().filebrowser;
			expect(typeof finder.open).eq('function');
		});
	});

	describe('Favorites', () => {
		describe('Add to favorite button', () => {
			it('Should add item to favorite and show favorites button', async () => {
				const finder = editor.filebrowser;
				finder.open();

				const favoritesButton =
					finder.panel.sidebar.getElm('favorites');
				await delay(100);
				const favoriteButton =
					finder.panel.items.elements[0].getElm('heart');

				expect(css(favoritesButton, 'display')).eq('none');
				expect(favoritesButton).is.not.null;

				expect(colorToHex(css(favoriteButton.firstChild, 'fill'))).eq(
					'#000000'
				);
				simulateEvent('click', favoriteButton);

				expect(css(favoritesButton, 'display')).eq('flex');
				expect(colorToHex(css(favoriteButton.firstChild, 'fill'))).eq(
					'#FF3B3B'
				);
			});

			describe('Click on favorites button', () => {
				it('Should open favorite list', async () => {
					const finder = editor.filebrowser;
					finder.open();
					await delay(100);

					const favoritesButton =
						finder.panel.sidebar.getElm('favorites');
					const favoriteButton =
						finder.panel.items.elements[0].getElm('heart');

					simulateEvent('click', favoriteButton);
					simulateEvent('click', favoritesButton);

					expect(finder.panel.items.elements.length).eq(1);
				});

				describe('Double click on favorite button on item', () => {
					it('Should remove from favorite list and hide favorites button', async () => {
						const finder = editor.filebrowser;
						finder.open();
						await delay(100);

						const favoritesButton =
							finder.panel.sidebar.getElm('favorites');
						const favoriteButton =
							finder.panel.items.elements[0].getElm('heart');

						simulateEvent('click', favoriteButton);
						expect(css(favoritesButton, 'display')).eq('flex');
						simulateEvent('click', favoriteButton);
						expect(css(favoritesButton, 'display')).eq('none');
					});
				});
			});
		});
	});
});
