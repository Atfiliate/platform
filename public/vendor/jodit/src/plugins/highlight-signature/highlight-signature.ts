/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IJodit, IDictionary, Nullable, HTMLTagNames } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { autobind, debounce } from 'jodit/core/decorators';
import { Dom } from 'jodit/core/dom/dom';
import { attr } from 'jodit/core/helpers/utils';
import { Jodit } from '../../index';
import { Config } from 'jodit/config';

declare module 'jodit/config' {
	interface Config {
		highlightSignature: {
			excludeTags: HTMLTagNames[];
			schema: IDictionary<
				(jodit: IJodit, matches: RegExpMatchArray) => HTMLElement
			>;
		};
	}
}

Config.prototype.highlightSignature = {
	schema: {},
	excludeTags: ['pre']
};

export class highlightSignature extends Plugin {
	/** @override */
	override requires: string[] = ['license'];

	protected afterInit(jodit: IJodit): void {
		if (Object.keys(jodit.o.highlightSignature.schema).length) {
			jodit.e
				.on('change afterSetMode', this.walkNodes)
				.on(
					'afterGetValueFromEditor',
					highlightSignature.removeUtilWrappers
				);
		}
	}

	protected beforeDestruct(jodit: IJodit): void {
		jodit.e
			.off('change afterSetMode', this.walkNodes)
			.off(
				'afterGetValueFromEditor',
				highlightSignature.removeUtilWrappers
			);
	}

	@debounce()
	private walkNodes(): void {
		if (!this.j.isEditorMode()) {
			return;
		}

		this.checkUtilsBoxToSchema();

		const { j } = this,
			nodeIterator = j.ed.createNodeIterator(
				j.editor,
				NodeFilter.SHOW_TEXT
			);

		this.j.async.cancelIdleCallback(this.idleId);
		this.workLoop(nodeIterator);
	}

	private idleId: number = 0;

	@autobind
	private runWorker(e: IdleDeadline, nodeIterator: NodeIterator): void {
		let node: Nullable<Text>;

		this.j.e.mute();

		try {
			do {
				node = nodeIterator.nextNode() as Nullable<Text>;

				if (!node) {
					return;
				}

				if (this.checkNormalizing(node)) {
					return;
				}

				this.checkReplaceSchemas(node);
			} while (node && e.timeRemaining() > 0);
		} finally {
			this.j.e.unmute();
		}

		this.workLoop(nodeIterator);
	}

	private workLoop(nodeIterator: NodeIterator): void {
		this.idleId = this.j.async.requestIdleCallback(
			(e: IdleDeadline) => {
				this.runWorker(e, nodeIterator);
			},
			{
				timeout: this.j.defaultTimeout
			}
		);
	}

	/**
	 * Checks if there are text nodes that are cut into pieces,
	 * if there are, normalizes the editor and starts the loop again
	 */
	private checkNormalizing(node: Node): boolean {
		if (Dom.isText(node.nextSibling)) {
			this.j.editor.normalize();
			this.walkNodes();
			return true;
		}

		return false;
	}

	/**
	 * Checks the content of the text node through the scheme setting and if there is a match, then replaces the found part
	 */
	private checkReplaceSchemas(node: Text): void {
		if (highlightSignature.hasUtilWrapper(node)) {
			return;
		}

		const value = node.nodeValue;

		if (value == null) {
			return;
		}

		const { j } = this,
			opts = j.o.highlightSignature;

		for (const schemaKey in opts.schema) {
			const regExp = RegExp(schemaKey);

			if (regExp.test(value)) {
				const matched = value.match(regExp);

				if (!matched || matched.index === undefined) {
					continue;
				}

				const elm: HTMLElement = opts.schema[schemaKey](
					this.j,
					matched
				);

				if (elm) {
					Dom.markTemporary(elm, {
						dataHighlightSchema: schemaKey
					});

					this.replaceMatchedTextToElm(node, value, matched, elm);
					return;
				}
			}
		}
	}

	/**
	 * Replaces the part that matches the schematic with the created element and restores the cursor position
	 */
	private replaceMatchedTextToElm(
		node: Text,
		value: string,
		matched: RegExpMatchArray,
		elm: HTMLElement
	): void {
		const { j } = this,
			{ range } = j.s,
			hasCursorInside = range.startContainer === node,
			offset = range.startOffset,
			index = matched.index ?? 0;

		node.nodeValue = value.substring(0, index);

		const rightPartText = value.substring(index + matched[0].length);

		if (rightPartText.length) {
			const rightPart = j.createInside.text(rightPartText);
			Dom.after(node, rightPart);
		}

		elm.innerText = matched[0];

		Dom.after(node, elm);

		if (hasCursorInside) {
			this.restoreCursorPosition(
				offset,
				node,
				elm.firstChild,
				elm.nextSibling
			);
		}
	}

	/**
	 * The text node already has a parent for highlighting
	 */
	private static hasUtilWrapper(node: Text): boolean {
		return Dom.isTemporary(node.parentElement);
	}

	/**
	 * Removes utility highlighting elements from HTML
	 */
	private static removeUtilWrappers(data: { value: string }): void {
		data.value = Dom.replaceTemporaryFromString(data.value);
	}

	/**
	 * Restores the cursor position to the place where it was before replacement
	 */
	private restoreCursorPosition(
		offset: number,
		...nodes: Array<Nullable<Node>>
	): void {
		for (const node of nodes) {
			if (node && node.nodeValue) {
				const value = node.nodeValue;

				if (value.length >= offset) {
					const range = this.j.s.createRange();
					range.setStart(node, offset);
					this.j.s.selectRange(range, false);
					break;
				}

				offset -= value.length;
			}
		}
	}

	/**
	 * Removes wrappers whose content no longer matches the schema
	 */
	private checkUtilsBoxToSchema(): void {
		Dom.temporaryList(this.j.editor).forEach((elm) => {
			const schema = attr(elm, 'dataHighlightSchema');

			if (!schema) {
				return;
			}

			const reg = RegExp(schema),
				text = elm.innerText ?? '';

			if (!reg.test(text) || text.replace(reg, '').length) {
				this.j.s.save();
				Dom.unwrap(elm);
				this.j.s.restore();
			}
		});
	}
}

Jodit.plugins.add('highlight-signature', highlightSignature);
