/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

const friends = [
	{
		value: '@Rachel',
		userId: '1',
		name: 'Rachel Green',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0000098'
	},
	{
		value: '@Chandler',
		userId: '2',
		name: 'Chandler Bing',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001612'
	},
	{
		value: '@Monica',
		userId: '3',
		name: 'Monica Geller',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001073'
	},
	{
		value: '@Ross',
		userId: '4',
		name: 'Dr. Ross Geller',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001710'
	},
	{
		value: '@Phoebe',
		userId: '5',
		name: 'Phoebe Buffay',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001435'
	},
	{
		value: '@Ursula',
		userId: '6',
		name: 'Ursula Buffay',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001435'
	},
	{
		value: '@Joey',
		userId: '7',
		name: 'Joey Tribbiani',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001455'
	}
];

describe('Autocomplete render test', () => {
	describe('Set itemRenderer', () => {
		describe('By feed object', () => {
			it('Should show styled item', async () => {
				const editor = getJodit();

				editor.e.fire('registerAutocompleteSource', {
					feed: friends,
					itemRenderer: (item) =>
						`<a href=${item.link} class='mention' title='${item.name}'>${item.value}</a>`
				});

				editor.s.insertHTML('@Mon');

				simulateEvent('keydown', editor.editor);

				await editor.async.requestIdlePromise();
				const popup = getOpenedPopup(editor);

				expect(popup).is.not.null;

				expect(popup.querySelector('.mention').outerHTML).equals(
					'<a href="https://www.imdb.com/title/tt0108778/characters/nm0001073" class="mention" title="Monica Geller">@Monica</a>'
				);

				simulateEvent(
					['mousedown', 'mouseup', 'click'],
					popup.querySelector('.jodit-autocomplete-item')
				);

				expect(editor.value).equals('<p>@Monica&nbsp;</p>');
			});
		});

		describe('in every item', () => {
			it('Should show styled item', async () => {
				const editor = getJodit();

				editor.e.fire('registerAutocompleteSource', {
					feed: friends.map((item) => ({
						...item,
						itemRenderer: (item) =>
							`<a href=${item.link} class='mention' title='${item.name}'>${item.value}</a>`
					}))
				});

				editor.s.insertHTML('@Chan');

				simulateEvent('keydown', editor.editor);

				await editor.async.requestIdlePromise();
				const popup = getOpenedPopup(editor);

				expect(popup).is.not.null;

				expect(popup.querySelector('.mention').outerHTML).equals(
					'<a href="https://www.imdb.com/title/tt0108778/characters/nm0001612" class="mention" title="Chandler Bing">@Chandler</a>'
				);

				simulateEvent(
					['mousedown', 'mouseup', 'click'],
					popup.querySelector('.jodit-autocomplete-item')
				);

				expect(editor.value).equals('<p>@Chandler&nbsp;</p>');
			});
		});
	});

	describe('Set insertValueRenderer', () => {
		describe('By feed object', () => {
			it('Should insert styled item', async () => {
				const editor = getJodit();

				editor.e.fire('registerAutocompleteSource', {
					feed: friends,
					insertValueRenderer: (item) =>
						`<a href=${item.link} class='mention' title='${item.name}'>${item.value}</a>`
				});

				editor.s.insertHTML('@Mon');

				simulateEvent('keydown', editor.editor);

				await editor.async.requestIdlePromise();
				const popup = getOpenedPopup(editor);

				simulateEvent(
					['mousedown', 'mouseup', 'click'],
					popup.querySelector('.jodit-autocomplete-item')
				);

				expect(editor.value).equals(
					'<p><a href="https://www.imdb.com/title/tt0108778/characters/nm0001073" class="mention" title="Monica Geller">@Monica</a></p>'
				);
			});

			describe('In the middle of the text', () => {
				it('Should insert styled item', async () => {
					const editor = getJodit();

					editor.e.fire('registerAutocompleteSource', {
						feed: friends,
						insertValueRenderer: (item) =>
							`<a href=${item.link} class='mention' title='${item.name}'>${item.value}</a>`
					});

					editor.value =
						'<p>My favorite character @Mon| - she is beautiful</p>';
					setCursorToChar(editor);

					simulateEvent('keydown', editor.editor);

					await editor.async.requestIdlePromise();
					const popup = getOpenedPopup(editor);

					simulateEvent(
						['mousedown', 'mouseup', 'click'],
						popup.querySelector('.jodit-autocomplete-item')
					);

					expect(editor.value).equals(
						'<p>My favorite character <a href="https://www.imdb.com/title/tt0108778/characters/nm0001073" class="mention" title="Monica Geller">@Monica</a> - she is beautiful</p>'
					);
				});
			});
		});

		describe('in every item', () => {
			it('Should insert styled item', async () => {
				const editor = getJodit();

				editor.e.fire('registerAutocompleteSource', {
					feed: friends.map((item) => ({
						...item,
						insertValueRenderer: (item) =>
							`<a href=${item.link} class='mention' title='${item.name}'>${item.value}</a>`
					}))
				});

				editor.s.insertHTML('@Chan');

				simulateEvent('keydown', editor.editor);

				await editor.async.requestIdlePromise();
				const popup = getOpenedPopup(editor);

				simulateEvent(
					['mousedown', 'mouseup', 'click'],
					popup.querySelector('.jodit-autocomplete-item')
				);

				expect(editor.value).equals(
					'<p><a href="https://www.imdb.com/title/tt0108778/characters/nm0001612" class="mention" title="Chandler Bing">@Chandler</a></p>'
				);
			});
		});
	});
});
