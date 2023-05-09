/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

const names = [
	'@mary',
	'@jain',
	'@entany',
	'@isaak',
	'@ivan',
	'@fedya',
	'@yakov',
	'@jhon',
	'@lena',
	'@elvin'
];

function registerAuto(editor, values) {
	editor.e.fire('registerAutocompleteSource', values);
}

describe('Autocomplete test', () => {
	describe('Smoke test', () => {
		it('Should have Autocomplete plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('autocomplete')).equals('function');
		});
	});

	describe('Input query', () => {
		it('Should show popup with variants', async () => {
			const editor = getJodit();
			registerAuto(editor, ['One', 'Two']);

			editor.s.insertHTML('On');

			simulateEvent('keydown', editor.editor);
			await editor.async.requestIdlePromise();
			const popup = getOpenedPopup(editor);

			expect(popup).is.not.null;
			expect(popup.innerText).equals('One');
		});

		describe('On the middle of string', () => {
			it('Should show popup with variants', async () => {
				const editor = getJodit();
				registerAuto(editor, ['One', 'Two']);

				editor.value = '<p>test On| test</p>';
				setCursorToChar(editor);

				simulateEvent('keydown', editor.editor);
				await editor.async.requestIdlePromise();
				const popup = getOpenedPopup(editor);

				expect(popup).is.not.null;
				expect(popup.innerText).equals('One');
			});
		});

		describe('Press on item', () => {
			it('Should replace part of word', async () => {
				const editor = getJodit();
				registerAuto(editor, ['Problem', 'Solve', 'Two']);

				editor.value = '<p>Pr|</p>';
				setCursorToChar(editor);

				simulateEvent('keydown', editor.editor);

				await editor.async.requestIdlePromise();
				const popup = getOpenedPopup(editor);

				expect(popup).is.not.null;

				expect(popup.innerText).equals('Problem');

				simulateEvent(
					'click',
					popup.querySelector('.jodit-autocomplete-item')
				);

				expect(editor.value).equals('<p>Problem&nbsp;</p>');
			});

			it('Should replace mention', async () => {
				const editor = getJodit();

				registerAuto(editor, names);

				editor.s.insertHTML('@f');

				simulateEvent('keydown', editor.editor);

				await editor.async.requestIdlePromise();
				const popup = getOpenedPopup(editor);

				expect(popup).is.not.null;

				expect(popup.innerText).equals('@fedya');

				simulateEvent(
					['mousedown', 'mouseup', 'click'],
					popup.querySelector('.jodit-autocomplete-item')
				);

				expect(editor.value).equals('<p>@fedya&nbsp;</p>');
			});

			it('Should emit change event', async () => {
				const values = [];
				const editor = getJodit({
					events: {
						change: (value) => {
							values.push(value);
						}
					}
				});

				editor.value = '<p>test|</p>';
				setCursorToChar(editor);

				registerAuto(editor, names);

				editor.s.insertHTML('@f');

				simulateEvent('keydown', editor.editor);

				await editor.async.requestIdlePromise();
				const popup = getOpenedPopup(editor);
				simulateEvent(
					['mousedown', 'mouseup', 'click'],
					popup.querySelector('.jodit-autocomplete-item')
				);

				expect(values).deep.eq([
					'<p>test|</p>',
					'<p>test</p>',
					'<p>test@f</p>',
					'<p>test@fedya&nbsp;</p>'
				]);
			});

			describe('With enter', () => {
				it('Should replace mention', async () => {
					const editor = getJodit();

					registerAuto(editor, names);

					editor.s.insertHTML('@f');

					simulateEvent('keydown', editor.editor);

					await editor.async.requestIdlePromise();
					const popup = getOpenedPopup(editor);

					expect(popup).is.not.null;

					expect(popup.innerText).equals('@fedya');

					simulateEvent('keydown', Jodit.KEY_ENTER, editor.editor);

					expect(editor.value).equals('<p>@fedya&nbsp;</p>');
				});
			});

			describe('With tab', () => {
				it('Should add mention', async () => {
					const editor = getJodit();

					registerAuto(editor, names);

					editor.value = '@f|';
					setCursorToChar(editor);

					simulateEvent('keydown', editor.editor);

					await editor.async.requestIdlePromise();
					const popup = getOpenedPopup(editor);
					expect(popup.innerText).equals('@fedya');

					simulateEvent('keydown', Jodit.KEY_TAB, editor.editor);

					expect(editor.value).equals('<p>@fedya&nbsp;</p>');
				});
			});

			describe('On the middle of string', () => {
				it('Should insert value in same place', async () => {
					const editor = getJodit();
					registerAuto(editor, ['One', 'Two']);

					editor.value = '<p>test On| test</p>';
					setCursorToChar(editor);

					simulateEvent('keydown', editor.editor);
					await editor.async.requestIdlePromise();
					const popup = getOpenedPopup(editor);
					simulateEvent(
						'click',
						popup.querySelector('.jodit-autocomplete-item')
					);

					expect(editor.value).equals('<p>test One&nbsp; test</p>');
				});
			});
		});
	});

	describe('Feeds', () => {
		async function checkFeedType(feed) {
			const editor = getJodit();

			registerAuto(editor, feed);

			editor.s.insertHTML('So');

			simulateEvent('keydown', editor.editor);

			await editor.async.requestIdlePromise();
			const popup = getOpenedPopup(editor);

			expect(popup).is.not.null;

			expect(popup.innerText).equals('Solve');

			simulateEvent(
				'click',
				popup.querySelector('.jodit-autocomplete-item')
			);

			expect(editor.value).equals('<p>Solve&nbsp;</p>');
		}

		describe('Callback', () => {
			it('Should show in popup returned items', async () => {
				const values = ['Problem', 'Solve', 'Two'];

				await checkFeedType((query) => {
					return values
						.filter((value) => value.indexOf(query) === 0)
						.map((value) => ({
							title: value,
							value
						}));
				});
			});
		});

		describe('Array', () => {
			describe('Of string', () => {
				it('Should show in popup array items', () =>
					checkFeedType(['Problem', 'Solve', 'Two']));
			});

			describe('Of typed item', () => {
				it('Should show in popup array items', () =>
					checkFeedType([
						{
							title: 'Problem',
							value: 'Problem'
						},
						{ title: 'Solve', value: 'Solve' },
						{ title: 'Two', value: 'Two' }
					]));
			});
		});

		describe('Object feed', () => {
			describe('Callback', () => {
				it('Should show in popup returned items', async () => {
					const values = ['Problem', 'Solve', 'Two'];

					await checkFeedType({
						feed: (query) => {
							return values
								.filter((value) => value.indexOf(query) === 0)
								.map((value) => ({
									title: value,
									value
								}));
						}
					});
				});
			});

			describe('Array', () => {
				describe('Of string', () => {
					it('Should show in popup array items', () =>
						checkFeedType({ feed: ['Problem', 'Solve', 'Two'] }));
				});

				describe('Of typed item', () => {
					it('Should show in popup array items', () =>
						checkFeedType({
							feed: [
								{
									title: 'Problem',
									value: 'Problem'
								},
								{ title: 'Solve', value: 'Solve' },
								{ title: 'Two', value: 'Two' }
							]
						}));
				});
			});
		});
	});

	describe('Register source', () => {
		it('Should listen `registerAutocompleteSource` event', async () => {
			const jodit = getJodit();

			jodit.e.fire('registerAutocompleteSource', () => {
				return [{ value: 'One' }, { value: 'Two' }];
			});

			expect(
				JSON.stringify(await jodit.e.fire('autocomplete', 'any'))
			).eq('[{"value":"One"},{"value":"Two"}]');
		});

		describe('Check matching', () => {
			it('Should listen `registerAutocompleteSource` event and match query', async () => {
				const jodit = getJodit();

				jodit.e.fire('registerAutocompleteSource', (query) => {
					return [{ value: 'One' }, { value: 'Two' }].filter(
						({ value }) => value.includes(query)
					);
				});

				expect(
					JSON.stringify(await jodit.e.fire('autocomplete', 'O'))
				).eq('[{"value":"One"}]');

				expect(
					JSON.stringify(await jodit.e.fire('autocomplete', 'Tw'))
				).eq('[{"value":"Two"}]');
			});
		});
	});

	describe('Events', () => {
		describe('autocomplete', () => {
			it('should register handler for this', async () => {
				const editor = getJodit();

				registerAuto(editor, names);

				expect(
					JSON.stringify(await editor.e.fire('autocomplete', '@i'))
				).eq(
					JSON.stringify([
						{ title: '@isaak', value: '@isaak' },
						{ title: '@ivan', value: '@ivan' }
					])
				);
			});
		});

		describe('select.autocomplete', () => {
			it('Should be fired on selection', async () => {
				const editor = getJodit();

				registerAuto(editor, names);

				editor.s.insertHTML('@f');

				simulateEvent('keydown', editor.editor);

				await editor.async.requestIdlePromise();
				const popup = getOpenedPopup(editor);

				expect(popup).is.not.null;

				expect(popup.innerText).equals('@fedya');

				const items = [];
				editor.e.on('select.autocomplete', (item) => {
					items.push(item);
				});

				simulateEvent(
					['mousedown', 'mouseup', 'click'],
					popup.querySelector('.jodit-autocomplete-item')
				);

				expect(JSON.stringify(items)).eq(
					JSON.stringify([{ title: '@fedya', value: '@fedya' }])
				);
			});
		});
	});
});
