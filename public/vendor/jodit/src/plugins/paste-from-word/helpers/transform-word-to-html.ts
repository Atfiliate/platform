/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { JElement } from '../element';
import type { IJodit } from 'jodit/types';

import { cases } from '../cases';
import { trim } from 'jodit/core/helpers/string/trim';
import { innerHTML } from '../element';

export function transformWordToHtml(
	jodit: IJodit,
	body: JElement,
	removeStyles: boolean,
	rtf: string
): string {
	const ctx = {
		jodit,
		rtf
	};

	body.forEach(function eachElm(elm: JElement | null): void {
		if (!elm) {
			return;
		}

		for (const fn of cases) {
			elm = fn(elm, ctx);
			if (elm == null) {
				break;
			}
		}

		elm?.forEach(eachElm);
	});

	if (removeStyles) {
		body.forEach((elm: JElement) => {
			elm.style.clear();
		}, true);
	}

	return trim(
		innerHTML(
			body,
			(elm) => !elm.isComment,
			true,
			jodit.o.pasteFromWord.allowedStyleProps
		)
	);
}
