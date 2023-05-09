/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { JElement } from '../element';
import { html } from '../element';

let inComment: number = 0;

export function removeInsideComment(elm: JElement): JElement | null {
	if (elm.isComment && /\[if.*(supportLists|gte vml).*]/.test(html(elm))) {
		inComment++;
		elm.remove();
	}

	if (elm.isComment && inComment > 0 && html(elm).includes('[endif]')) {
		inComment = inComment > 0 ? inComment - 1 : 0;
		elm.remove();
	}

	if (inComment) {
		if (
			elm.isText ||
			(elm.name === 'img' &&
				(!elm.attributes.src || /^file:/.test(elm.attributes.src)))
		) {
			elm.remove();
			return null;
		}
	}

	return elm;
}
