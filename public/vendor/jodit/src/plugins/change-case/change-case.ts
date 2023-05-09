/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './config';

import type { IJodit } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Dom } from 'jodit/core/dom/dom';
import { ucfirst } from 'jodit/core/helpers/string/ucfirst';
import { Jodit } from '../../index';

export class changeCase extends Plugin {
	/** @override */
	override requires = ['license'];

	/** @override */
	override buttons: Plugin['buttons'] = [
		{
			name: 'changeCase',
			group: 'font-style'
		}
	];

	/** @override */
	protected afterInit(jodit: IJodit): void {
		jodit.registerCommand('changeCase', {
			exec: (command: string, ignore: unknown, mode: string): void => {
				mode = mode.toLowerCase();

				const range = jodit.s.range,
					{ startContainer, startOffset } = range;

				if (jodit.s.isCollapsed()) {
					const current = jodit.s.current(true);

					if (current && current.parentElement) {
						this.applyCase(mode, current.parentElement);
					}

					range.setStart(startContainer, startOffset);
					jodit.s.selectRange(range);
				} else {
					const left = range.cloneRange(),
						right = range.cloneRange(),
						fakeLeft = jodit.createInside.fake(),
						fakeRight = jodit.createInside.fake();

					left.collapse(true);
					right.collapse(false);

					left.insertNode(fakeLeft);
					right.insertNode(fakeRight);

					Dom.between(fakeLeft, fakeRight, (node) => {
						this.applyCase(mode, node);
					});

					range.setStartAfter(fakeLeft);
					range.setEndBefore(fakeRight);
					jodit.s.selectRange(range);

					Dom.safeRemove(fakeLeft);
					Dom.safeRemove(fakeRight);
				}
			}
		});
	}

	/**
	 * Change case in text nodes by mode
	 */
	private applyCase(mode: string, node: Node): void {
		const change = (str: string): string => {
			switch (mode) {
				case 'lowercase':
					return str.toLowerCase();
				case 'uppercase':
					return str.toUpperCase();
				default:
					return str.split(' ').map(ucfirst).join(' ');
			}
		};

		if (Dom.isText(node)) {
			const txt = node.nodeValue;

			if (txt) {
				node.nodeValue = change(txt);
			}
		} else {
			Dom.each(node, (child) => {
				this.applyCase(mode, child);
			});
		}
	}

	/** @override */
	protected beforeDestruct(jodit: IJodit): void {}
}

Jodit.plugins.add('change-case', changeCase);
