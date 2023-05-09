/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import { Jodit } from '../../index';
import { INSERT_AS_HTML, INSERT_AS_TEXT } from 'jodit/core/constants';
import { isString } from 'jodit/core/helpers/checker/is-string';
import { pasteFromWord } from 'jodit/plugins/paste-from-word/paste-from-word';
import type { PastedData, PasteEvent } from 'jodit/src/plugins/paste/interface';
import type { InsertMode } from 'jodit/types';

import { applyStylesPro } from './helpers';
import './config';
import { pasteInsertHtml } from 'jodit/src/plugins/paste/helpers';

export class PasteFromWordPro extends pasteFromWord {
	protected override insertFromWordByType(
		e: PasteEvent,
		html: string,
		insertType: InsertMode,
		texts: PastedData
	): void {
		if (
			this.j.o.pasteFromWord.enable &&
			(insertType === INSERT_AS_HTML || insertType === INSERT_AS_TEXT)
		) {
			html = applyStylesPro(
				this.j,
				html,
				insertType === INSERT_AS_TEXT,
				texts.rtf
			);

			// @ts-ignore
			if (this.j.o.beautifyHTML) {
				const value = this.j.events?.fire('beautifyHTML', html);

				if (isString(value)) {
					html = value;
				}
			}

			pasteInsertHtml(e, this.j, html);
			return;
		}

		return super.insertFromWordByType(e, html, insertType, texts);
	}
}

Jodit.plugins.remove('pasteFromWord');
Jodit.plugins.add('pasteFromWordPro', PasteFromWordPro);
