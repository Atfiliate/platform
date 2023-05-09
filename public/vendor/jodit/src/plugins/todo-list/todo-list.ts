/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './todo-list.less';

import type {
	IJodit,
	CommitMode,
	ICommitStyle,
	Nullable,
	HTMLTagNames
} from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { autobind, watch } from 'jodit/core/decorators';
import { $$, attr } from 'jodit/core/helpers/utils';
import { Dom } from 'jodit/core/dom/dom';
import { NO_EMPTY_TAGS } from 'jodit/core/constants';
import { REPLACE, UNWRAP, WRAP, CHANGE } from 'jodit/core/selection';
import { Jodit } from '../../index';
import './config';

const apply = true;

export class TodoList extends Plugin {
	override requires = ['license'];

	override buttons = [
		{
			name: 'todoList',
			group: 'list'
		}
	];

	protected afterInit(jodit: IJodit): void {
		jodit.registerCommand('todoList', this.onCommand);
	}

	private __isOwnCommand: boolean = false;

	@autobind
	private onCommand(): false {
		try {
			this.__isOwnCommand = true;
			this.jodit.s.commitStyle({
				element: 'ul',
				attributes: {
					class: this.j.o.todoList.className
				},
				hooks: apply
					? {
							afterWrapList: this.__afterWrapList,
							afterToggleAttribute: this.__afterWrapList
					  }
					: {}
			});
		} finally {
			this.__isOwnCommand = false;
		}

		return false;
	}

	@autobind
	private __prependInputLabel(li: HTMLElement): void {
		const { jodit } = this;

		const { labelClassName, inputFactory } = this.j.o.todoList;
		if (li.querySelector('label.' + labelClassName)) {
			return;
		}

		const label = jodit.createInside.element('label', {
			contenteditable: 'false',
			class: labelClassName
		});

		const input = inputFactory(jodit);

		label.appendChild(input);
		Dom.prepend(li, label);
	}

	@watch(':commitStyleAfterToggleList')
	protected __afterToggleList(mode: CommitMode, list: HTMLElement): void {
		if (!apply) return;

		if ((mode === CHANGE || mode === REPLACE) && this.__isOwnCommand) {
			return this.__appendInputs(list);
		}

		if (mode === UNWRAP || mode === REPLACE || mode === CHANGE) {
			return this.__removeInputs(list);
		}
	}

	private __appendInputs(list: HTMLElement): void {
		list.querySelectorAll('li').forEach(this.__prependInputLabel);
	}

	private __removeInputs(list: HTMLElement): void {
		const { labelClassName } = this.j.o.todoList;
		list.querySelectorAll('label.' + labelClassName).forEach(
			Dom.safeRemove
		);
	}

	@watch(':commitStyleBeforeUnwrapList')
	protected __beforeToggleOrderedList(
		mode: CommitMode,
		list: HTMLElement,
		style: ICommitStyle
	): HTMLElement | void {
		if (!apply) return;

		const ukey = '__beforeToggleOrderedList';
		if (
			mode !== REPLACE &&
			(list.classList.contains(this.j.o.todoList.className) ||
				style.isApplied(list, ukey)) &&
			(style.element === 'ul' || style.element === 'ol') &&
			style.options.attributes?.class !== this.j.o.todoList.className
		) {
			const wrapper = Dom.replace<HTMLElement>(
				list,
				style.element,
				this.jodit.createInside
			);
			style.setApplied(wrapper, ukey);
			this.__removeInputs(wrapper);
			return wrapper;
		}
	}

	@watch(':afterEnter')
	protected __afterEnter(): void {
		$$(
			'ul.' + this.j.o.todoList.className + ' li',
			this.jodit.editor
		).forEach(this.__prependInputLabel);
	}

	@watch(':afterTab')
	protected __afterTab(): void {
		$$(
			'ul:not(.' + this.j.o.todoList.className + ') > li > label',
			this.jodit.editor
		)
			.filter(this.isTodoLeafLabel)
			.forEach(Dom.safeRemove);
	}

	@watch('j.ed:selectionchange')
	@watch(':afterEnter')
	protected __changeSelection(e: MouseEvent): void {
		const target = this.j.s.current();
		if (this.isTodoLeafLabel(target)) {
			e.preventDefault();
			e.stopPropagation();
			this.j.s.setCursorAfter(target);
		}
	}

	@watch(':enterIsEmptyListLeaf')
	protected __isEmptyListLeaf(li: HTMLElement): boolean {
		return Dom.isEmpty(li, (node: Element): boolean => {
			if (
				node.nodeName.toLowerCase() === 'input' &&
				this.isTodoLeafLabel(node.parentElement)
			) {
				return false;
			}
			return NO_EMPTY_TAGS.has(
				node.tagName.toLowerCase() as HTMLTagNames
			);
		});
	}

	/**
	 * Remove checkbox before processing backspace
	 */
	@watch(':backSpaceBeforeCases')
	protected __backSpaceBeforeCases(backspace: boolean, fake: Node): void {
		if (backspace) {
			const sibling = Dom.findNotEmptySibling(fake, true);
			this.isTodoLeafLabel(sibling) && Dom.safeRemove(sibling);
		}
	}

	@watch(':backSpaceIsMovedIgnore')
	@watch(':isInvisibleForCursor')
	protected __isInvisibleForCursor(elm: HTMLElement): void | true {
		if (this.isTodoLeafLabel(elm)) {
			return true;
		}
	}

	/**
	 * Just normalize the list if all of a sudden the checkboxes
	 */
	@watch(':backSpaceAfterDelete')
	protected __backSpaceAfterDelete(): void | true {
		const { labelClassName } = this.j.o.todoList;
		$$('label.' + labelClassName, this.jodit.editor).forEach((label) => {
			if (!label.closest('ul.' + this.j.o.todoList.className)) {
				Dom.safeRemove(label);
			} else {
				label.previousSibling &&
					Dom.prepend(label.parentElement!, label);
			}
		});
	}

	@autobind
	protected __afterWrapList(mode: CommitMode, wrapper: HTMLElement): void {
		mode === WRAP && this.__appendInputs(wrapper);
	}

	@watch(':click')
	protected __onClickInput(e: MouseEvent): void {
		const input = e.target as HTMLInputElement;

		if (
			input &&
			Dom.isTag(input, 'input') &&
			input.type === 'checkbox' &&
			this.isTodoLeafLabel(input.parentElement)
		) {
			attr(input, 'checked', input.checked ? 'checked' : null);
		}
	}

	@autobind
	private isTodoLeafLabel(node: Nullable<Node>): node is HTMLElement {
		const { labelClassName } = this.j.o.todoList;
		return (
			Dom.isHTMLElement(node) &&
			(node as HTMLElement).classList.contains(labelClassName)
		);
	}

	protected beforeDestruct(jodit: IJodit): void {}
}

Jodit.plugins.add('todo-list', TodoList);
