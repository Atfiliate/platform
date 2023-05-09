/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('TodoList', () => {
	describe('Smoke test', () => {
		it('Should have plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('todo-list')).equals('function');
		});

		it('Should have section in controls', () => {
			expect(typeof Jodit.defaultOptions.controls.todoList).equals(
				'object'
			);
		});

		it('Should have button in buttons list', () => {
			expect(getButton('todoList', getJodit())).is.not.null;
		});
	});

	describe('Check options', () => {
		it('Should work perfect', () => {
			const editor = getJodit({
				todoList: {
					className: 'list1',
					labelClassName: 'list1_label1',
					inputFactory: (j) => {
						return j.createInside.element('span', {
							class: 'checkbox'
						});
					}
				}
			});

			editor.value = '<p>|text|</p>';
			setCursorToChar(editor);
			clickButton('todoList', editor);
			replaceCursorToChar(editor);
			expect(sortAttributes(editor.value)).equals(
				'<ul class="list1"><li><label class="list1_label1" contenteditable="false"><span class="checkbox"></span></label>|text|</li></ul>'
			);
		});
	});

	describe('Check functionality', () => {
		let editor;
		beforeEach(() => {
			editor = getJodit({
				buttons: ['todoList', 'ul', 'ol'],
				toolbarAdaptive: false
			});
		});

		const I =
			'<label class="todo-list__label" contenteditable="false"><input tabindex="-1" type="checkbox"></label>';

		const _ = (s) => s.replace(/[\n\t]/g, '').replaceAll(I, '<Input/>');

		function one(input, result, index, action, skip) {
			(skip ? describe.skip : describe)(
				`For input #${index} ${_(input)}`,
				() => {
					it('Should be result ' + _(result), () => {
						editor.value = input.replace(/<Input\/>/g, I);
						setCursorToChar(editor);
						action(index, input, result);
						replaceCursorToChar(editor);
						expect(_(sortAttributes(editor.value))).equals(
							_(result)
						);
					});
				}
			);
		}

		describe('Click on todoList button', () => {
			[
				[
					'<p>|text</p><p>pop</p><p>oup</p><p>test|</p>',
					`<ul class="todo-list">
						<li>${I}|text</li>
						<li>${I}pop</li>
						<li>${I}oup</li>
						<li>${I}test|</li>
					</ul>`
				],
				[
					'<p>|text|</p>',
					`<ul class="todo-list"><li>${I}|text|</li></ul>`
				],
				[
					`<ul class="todo-list"><li>${I}test|</li></ul>`,
					'<p>test|</p>'
				],
				[
					'<ul><li>test|</li></ul>',
					`<ul class="todo-list"><li>${I}test|</li></ul>`
				],
				[
					'<ul><li>|usual</li><li>list|</li></ul>',
					`<ul class="todo-list"><li>${I}|usual</li><li>${I}list|</li></ul>`
				],
				[
					'<ul><li>|usual</li><li>list</li><li>element|</li></ul>',
					`<ul class="todo-list"><li>${I}|usual</li><li>${I}list</li><li>${I}element|</li></ul>`
				],
				[
					`<ul class="todo-list"><li>${I}|usual</li><li>${I}list</li><li>${I}element|</li></ul>`,
					'<p>|usual</p><p>list</p><p>element|</p>'
				],
				[
					`<ul class="todo-list"><li>${I}usual</li></ul><p>list|</p><ul class="todo-list"><li>${I}element</li></ul>`,
					`<ul class="todo-list"><li>${I}usual</li><li>${I}list|</li><li>${I}element</li></ul>`
				],
				[
					'<ol><li>usual</li><li>l|is|t</li><li>element</li></ol>',
					`<ol><li>usual</li></ol><ul class="todo-list"><li>${I}l|is|t</li></ul><ol><li>element</li></ol>`
				],
				[
					'<ul><li>usual</li><li>l|is|t</li><li>element</li></ul>',
					`<ul><li>usual</li></ul><ul class="todo-list"><li>${I}l|is|t</li></ul><ul><li>element</li></ul>`
				],
				[
					'<ol><li>test|</li></ol>',
					`<ul class="todo-list"><li>${I}test|</li></ul>`
				],
				[
					'<ol><li>pop</li></ol><ol><li>test|</li></ol><ol><li>stat</li></ol>',
					`<ol><li>pop</li></ol><ul class="todo-list"><li>${I}test|</li></ul><ol><li>stat</li></ol>`
				]
			].forEach(([input, result], index) =>
				one(input, result, index, () => {
					clickButton('todoList', editor);
				})
			);
		});

		describe('Click usual list button', () => {
			[
				[
					`<ol><li>pop</li></ol><ul class="todo-list"><li>${I}test|</li></ul><ol><li>stat</li></ol>`,
					'<ol><li>pop</li><li>test|</li><li>stat</li></ol>',
					'ol'
				],
				[
					`<ol><li>pop</li></ol><ul class="todo-list"><li>${I}test|</li></ul><ol><li>stat</li></ol>`,
					'<ol><li>pop</li></ol><ul><li>test|</li></ul><ol><li>stat</li></ol>',
					'ul'
				],
				[
					`<ul class="todo-list"><li>${I}|test|</li></ul>`,
					'<ol><li>|test|</li></ol>',
					'ol'
				],
				[
					`<ul class="todo-list"><li>${I}|text|</li></ul>`,
					'<ul><li>|text|</li></ul>',
					'ul'
				],
				[
					`<ul class="todo-list"><li>${I}text</li><li>${I}pop|</li><li>${I}let</li></ul>`,
					'<ul><li>|text</li><li>pop</li><li>let|</li></ul>',
					'ul',
					true
				],
				[
					`<ul class="todo-list"><li>${I}|text</li><li>${I}pop</li><li>${I}let|</li></ul>`,
					'<ul><li>|text</li><li>pop</li><li>let|</li></ul>',
					'ul'
				]
			].forEach(([input, result, btn, skip], index) => {
				one(
					input,
					result,
					index,
					() => {
						clickButton(btn, editor);
					},
					skip
				);
			});
		});

		describe('Keypress', () => {
			describe('Enter', () => {
				[
					['<p>test|</p>', '<p>test</p><p>|<br></p>'],
					[
						'<ul><li>test|</li></ul>',
						'<ul><li>test</li><li>|<br></li></ul>'
					],
					[
						'<ul class="todo-list"><li><Input/>test|</li></ul>',
						'<ul class="todo-list"><li><Input/>test</li><li><Input/>|<br></li></ul>'
					],
					[
						'<ul class="todo-list"><li><Input/>test</li><li><Input/>|<br></li></ul>',
						'<ul class="todo-list"><li><Input/>test</li></ul><p>|<br></p>'
					],
					[
						'<ul class="todo-list"><li><Input/>test</li><li><Input/>|<br></li><li><Input/>pop</li></ul>',
						'<ul class="todo-list"><li><Input/>test</li></ul><p>|<br></p><ul class="todo-list"><li><Input/>pop</li></ul>'
					],
					[
						'<ul class="todo-list"><li><Input/>test</li><li><Input/>pop|art<br></li><li><Input/>pop</li></ul>',
						'<ul class="todo-list"><li><Input/>test</li><li><Input/>pop</li><li><Input/>|art<br></li><li><Input/>pop</li></ul>'
					]
				].forEach(([input, result], index) => {
					one(input, result, index, () => {
						simulateEvent(
							'keydown',
							Jodit.KEY_ENTER,
							editor.editor
						);
					});
				});
			});

			describe('BackSpace', () => {
				[
					['<p>test|</p>', '<p>tes|</p>'],
					['<ul><li>|test</li></ul>', '<p>|test</p>'],
					[
						'<ul class="todo-list"><li><Input/>|test</li></ul>',
						'<p>|test</p>'
					],
					[
						'<ul><li>pop</li></ul><p>|<br></p><ul><li>test</li></ul>',
						'<ul><li>pop|</li><li>test</li></ul>'
					],
					[
						'<ul><li>pop</li></ul><p>|<br></p>',
						'<ul><li>pop|</li></ul>'
					],
					[
						'<ul class="todo-list"><li><Input/>test</li><li><Input/>|<br></li></ul>',
						'<ul class="todo-list"><li><Input/>test|</li></ul>'
					],
					[
						'<ul><li>pop</li></ul><p>|<br></p><ul class="todo-list"><li><Input/>test</li></ul>',
						'<ul><li>pop|</li><li>test</li></ul>'
					]
				].forEach(([input, result], index) => {
					one(input, result, index, () => {
						simulateEvent(
							'keydown',
							Jodit.KEY_BACKSPACE,
							editor.editor
						);
					});
				});
			});

			describe('Delete', () => {
				[
					['<p>|test</p>', '<p>|est</p>'],
					['<ul><li>test|</li></ul>', '<p>test|</p>'],
					[
						'<ul class="todo-list"><li><Input/>test|</li><li><Input/>pop</li></ul>',
						'<ul class="todo-list"><li><Input/>test|pop</li></ul>'
					]
				].forEach(([input, result], index) => {
					one(input, result, index, () => {
						simulateEvent(
							'keydown',
							Jodit.KEY_DELETE,
							editor.editor
						);
					});
				});
			});

			describe('Tab', () => {
				[
					[
						'<ul><li>test</li><li>|<br></li></ul>',
						'<ul><li>test<ul><li>|<br></li></ul></li></ul>'
					],
					[
						'<ul class="todo-list"><li><Input/>test</li><li><Input/>|<br></li></ul>',
						'<ul class="todo-list"><li><Input/>test<ul class="todo-list"><li><Input/>|<br></li></ul></li></ul>'
					],
					[
						'<ul class="todo-list"><li><Input/>test<ul class="todo-list"><li><Input/>|test</li></ul></li></ul>',
						'<ul class="todo-list"><li><Input/>test</li><li><Input/>|test</li></ul>',
						true
					],
					[
						'<ul><li>pop</li><li><ul class="todo-list"><li><Input/>test</li><li><Input/>|test</li></ul></li></ul>',
						'<ul><li>pop</li><li><ul class="todo-list"><li><Input/>test</li></ul></li><li>|test</li></ul>',
						true
					]
				].forEach(([input, result, shift], index) => {
					one(input, result, index, () => {
						simulateEvent(
							'keydown',
							Jodit.KEY_TAB,
							editor.editor,
							() => ({
								shiftKey: Boolean(shift)
							})
						);
					});
				});
			});
		});
	});
});
