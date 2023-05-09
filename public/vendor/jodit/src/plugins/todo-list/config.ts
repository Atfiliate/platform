/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { Controls, IJodit } from 'jodit/types';

import { Config } from 'jodit/config';
import { Icon } from 'jodit/core/ui/icon';
import { Dom } from 'jodit/core/dom/dom';

declare module 'jodit/config' {
	interface Config {
		todoList: {
			className: string;
			labelClassName: string;
			inputFactory: (jodit: IJodit) => HTMLElement;
		};
	}
}

Config.prototype.todoList = {
	className: 'todo-list',
	labelClassName: 'todo-list__label',
	inputFactory: (jodit: IJodit): HTMLElement =>
		jodit.createInside.element('input', {
			type: 'checkbox',
			tabindex: -1
		})
};

Config.prototype.controls.todoList = {
	tooltip: 'To-do List',
	icon: 'todo-list',
	command: 'todolist',
	isActive(e: IJodit): boolean {
		const current = e.s.current();
		return Boolean(
			current &&
				Dom.closest(
					current,
					(n) =>
						Dom.isElement(n) &&
						Dom.isTag(n, 'ul') &&
						n.classList.contains('todo-list'),
					e.editor
				)
		);
	}
} as Controls<IJodit>;

Icon.set('todo-list', require('./assets/todo-list.svg'));
