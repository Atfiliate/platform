/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './page-break.css';

import type { IJodit } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Jodit } from '../../index';

import './config';

import { Dom } from 'jodit/core/dom';
import { watch, debounce } from 'jodit/core/decorators';
import { $$, attr } from 'jodit/core/helpers';

export class PageBreak extends Plugin {
	override requires = ['license'];
	override buttons = [
		{
			name: 'pageBreak',
			group: 'insert'
		}
	];

	protected afterInit(jodit: IJodit): void {
		jodit.registerCommand('insertPageBreak', () => {
			const pageBreak = jodit.createInside.div('', {});
			this.decoratePageBreak(pageBreak);

			jodit.s.insertNode(pageBreak, false, false);

			let parentNode = pageBreak.parentNode;

			while (parentNode && parentNode !== jodit.editor) {
				Dom.after(parentNode, pageBreak);

				if (Dom.isBlock(parentNode)) {
					break;
				}

				parentNode = pageBreak.parentNode;
			}

			jodit.s.setCursorAfter(pageBreak);
			jodit.setEditorValue();
		});
	}

	private decoratePageBreak(pageBreak: HTMLElement): void {
		attr(pageBreak, {
			'data-jodit-page-break': true,
			contenteditable: false
		});

		pageBreak.innerText = this.j.i18n('Page break');
	}

	protected beforeDestruct(): void {}

	@watch([':change', ':afterSetMode'])
	@debounce()
	protected onChange(): void {
		$$(
			'[style*="page-break-after"],[style*="page-break-before"]',
			this.j.editor
		).forEach((div: HTMLElement) => {
			if (Dom.isEmpty(div) && !attr(div, 'data-jodit-page-break')) {
				this.decoratePageBreak(div);
			}
		});
	}

	@watch(':afterGetValueFromEditor')
	protected onAfterGetValueFromEditor(data: { value: string }): void {
		data.value = data.value.replace(
			/<div[^>]+data-jodit-page-break[^>]+>[^]*?<\/div>/gi,
			this.j.o.pageBreak.separator
		);
	}
}

Jodit.plugins.add('pageBreak', PageBreak);
