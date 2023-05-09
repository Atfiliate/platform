/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IDictionary } from 'jodit/types';
import { Dom } from 'jodit/core/dom';
import { INSEPARABLE_TAGS } from 'jodit/core/constants';
import { assert } from 'jodit/core/helpers';
import { html } from './render';
import { Style } from './style';

const singleTags: Set<string> = new Set(INSEPARABLE_TAGS);

export class JElement {
	name: string;
	readonly type: number;
	get isText(): boolean {
		return this.type === Node.TEXT_NODE;
	}

	get isElement(): boolean {
		return this.type === Node.ELEMENT_NODE;
	}

	get isComment(): boolean {
		return this.type === Node.COMMENT_NODE;
	}

	get isSingle(): boolean {
		return singleTags.has(this.name);
	}

	get length(): number {
		return this.children.length;
	}

	attributes: IDictionary;
	style: Style;

	private readonly children: JElement[];

	protected constructor(node: Node, public parent: JElement | null) {
		this.name = node.nodeName.toLowerCase();
		this.type = node.nodeType;
		this.attributes = readAttributes(node);

		this.style = new Style(this.attributes.style);
		this.children = [];

		node.childNodes.forEach((node) =>
			this.children.push(JElement.make(node, this))
		);
	}

	static make(node: Node, parent: JElement | null = null): JElement {
		return new JElement(node, parent);
	}

	wrap(tag: string): JElement {
		assert(this.parent != null, "You can't wrap the root element");

		const wrapper = JElement.make(document.createElement(tag), this.parent);

		const index = this.parent.children.indexOf(this) ?? -1;

		if (index === -1) {
			this.parent.append(wrapper);
		} else {
			this.parent.children[index] = wrapper;
		}

		wrapper.append(this);

		return wrapper;
	}

	append(child: JElement): this {
		assert(child !== this, 'Forbidden to add to yourself');
		child.remove();
		this.children.push(child);
		child.parent = this;
		return this;
	}

	get previousElement(): JElement | null {
		if (!this.parent) {
			return null;
		}

		const { children } = this.parent,
			index = children.indexOf(this);

		if (index !== -1) {
			for (let i = index - 1; i >= 0; i -= 1) {
				if (children[i].isElement) {
					return children[i];
				}
			}
		}

		return null;
	}

	get lastElement(): JElement | null {
		const { children } = this;

		for (let i = children.length - 1; i >= 0; i -= 1) {
			if (children[i].isElement) {
				return children[i];
			}
		}

		return null;
	}

	get previous(): JElement | null {
		return this.sibling(false) ?? this.parent?.previous ?? null;
	}

	get next(): JElement | null {
		return this.sibling(true) ?? this.parent?.next ?? null;
	}

	private sibling(next: boolean): JElement | null {
		if (!this.parent) {
			return null;
		}

		const { children } = this.parent,
			index = children.indexOf(this);

		if (index !== -1 && children[index + (next ? 1 : -1)]) {
			return children[index + (next ? 1 : -1)];
		}

		return null;
	}

	forEach(
		callbackFn: (node: JElement) => void | false,
		recursion: boolean = false
	): void | false {
		const children = [...this.children];

		for (const child of children) {
			if (callbackFn(child) === false) {
				return false;
			}

			if (recursion && child.forEach(callbackFn, true) === false) {
				return false;
			}
		}
	}

	find(
		predicate: (child: JElement) => boolean,
		recursion: boolean = true
	): JElement[] {
		const result: JElement[] = [];

		this.forEach((elm) => {
			if (predicate(elm)) {
				result.push(elm);
			}
		}, recursion);

		return result;
	}

	map<T>(callbackFn: (node: JElement) => T): T[] {
		return this.children.map(callbackFn);
	}

	remove(): this {
		const index = this.parent?.children.indexOf(this);
		if (index != null && index !== -1) {
			this.parent?.children.splice(index, 1);
		}

		return this;
	}

	textBetween(
		start: (n: JElement) => boolean,
		end: (n: JElement) => boolean
	): string {
		let startFound: boolean = false;

		const result: string[] = [];

		this.forEach((node): void | false => {
			if (!startFound && start(node)) {
				startFound = true;
			}

			if (startFound && node.isText) {
				result.push(html(node));
			}

			if (startFound && end(node)) {
				return false;
			}
		}, true);

		return result.join('');
	}
}

function readAttributes(node: Node): IDictionary {
	const result: IDictionary = {};

	if (Dom.isElement(node)) {
		for (let i = 0, attrs = node.attributes; i < attrs.length; i += 1) {
			result[attrs[i].name] = attrs[i].value;
		}
	} else {
		result['nodeValue'] = node.nodeValue;
	}

	return result;
}
