/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { JElement } from '../element';

const extraTags = new Set([
	'o:p',
	'xml',
	'script',
	'meta',
	'link',
	'v:imagedata',
	'style'
]);

export function removeExtraTags(elm: JElement): JElement | null {
	// Remove invisible
	if (elm.style.get('display') === 'none') {
		elm.remove();
		return null;
	}

	// Remove empty tag
	if (elm.length === 0 && elm.name === 'span') {
		elm.remove();
		return null;
	}

	// Remove invalid tags
	if (extraTags.has(elm.name)) {
		elm.remove();
		return null;
	}

	return elm;
}
