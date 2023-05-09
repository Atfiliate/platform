/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { JElement } from '../element';

const extraAttributes = [
	'cellspacing',
	'cellpadding',
	'border',
	'v:shapes',
	'o:spid'
];

export function clearAttributes(elm: JElement): null | JElement {
	if (/^OLE_LINK\d+$/.test(elm.attributes.name)) {
		elm.attributes.name = null;
		if (elm.length === 0) {
			elm.remove();
			return null;
		}
	}

	if (elm.attributes.name === '_GoBack') {
		elm.attributes.name = null;
	}

	// Remove extra attributes
	for (const attr of extraAttributes) {
		if (elm.attributes[attr]) {
			elm.attributes[attr] = null;
		}
	}

	return elm;
}
