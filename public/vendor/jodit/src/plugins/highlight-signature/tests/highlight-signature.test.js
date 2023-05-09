/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Highlight signature test', () => {
	describe('Smoke test', () => {
		it('Should have highlight-signature plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('highlightSignature')).equals(
				'function'
			);
		});
	});

	describe('Highlight email', () => {
		it('Should wrap email in strong element', (done) => {
			const editor = getJodit({
				highlightSignature: {
					schema: {
						'[^ ]+@[^\\s]+': (jodit) =>
							jodit.createInside.element('strong')
					}
				}
			});

			editor.value = '<p>Hi Valery chupurnov@gmail.om</p>';

			setTimeout(() => {
				expect(editor.value).eq('<p>Hi Valery chupurnov@gmail.om</p>');
				expect(editor.getNativeEditorValue()).eq(
					'<p>Hi Valery <strong data-highlight-schema="[^ ]+@[^\\s]+" data-jodit-temp="true">chupurnov@gmail.om</strong></p>'
				);
				done();
			}, 150);
		});
	});

	describe('Highlight some macros', () => {
		it('Should wrap that macros inside colorized span', (done) => {
			const editor = getJodit({
				highlightSignature: {
					schema: {
						'\\$\\{([^}]+)\\}': (jodit, matched) => {
							let color = 'yellow'; // all another macros will be `yellow`

							switch (matched[1]) {
								case 'formSubmittedDate':
									color = 'red';
									break;

								case 'formSessionURL':
									color = '#0f0';
									break;
							}

							return jodit.createInside.element('span', {
								style: {
									backgroundColor: color
								}
							});
						}
					}
				}
			});

			const sourceValue =
				'<p>The text ${formSubmittedDate} and ${formSessionURL} has some styling/decoration around it.</p>';

			editor.value = sourceValue;

			editor.async.setTimeout(async () => {
				await editor.async.requestIdlePromise();
				expect(editor.value).eq(sourceValue);

				expect(editor.element.value).eq(sourceValue);

				expect(sortAttributes(editor.getNativeEditorValue())).eq(
					'<p>The text <span data-highlight-schema="\\$\\{([^}]+)\\}" data-jodit-temp="true" style="background-color:red">${formSubmittedDate}</span> and <span data-highlight-schema="\\$\\{([^}]+)\\}" data-jodit-temp="true" style="background-color:#00FF00">${formSessionURL}</span> has some styling/decoration around it.</p>'
				);

				done();
			}, 200);
		});
	});
});
