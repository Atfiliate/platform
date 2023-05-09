/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { JElement } from './element';
import { html } from './render';
import { LEVEL_KEY, STYLE_KEY, TYPE_KEY } from '../constants';

export function isList(
	elm: JElement | null
): elm is JElement & { name: 'ul' | 'ol' } {
	return Boolean(elm && (elm.name === 'ol' || elm.name === 'ul'));
}

export function isLeaf(elm: JElement | null): elm is JElement & { name: 'li' } {
	return Boolean(elm && elm.name === 'li');
}

export function isPseudoLeaf(elm: JElement): boolean {
	return (
		(elm.name !== 'li' &&
			/mso-list:\s*l\d+ level\d+ lfo\d+/i.test(elm.attributes.style)) ||
		(/msolistparagraph/i.test(elm.attributes.class) &&
			Boolean(
				elm.find((c) => c.isComment && html(c).includes('supportLists'))
					.length
			))
	);
}

export function isSameType(leaf: JElement, list: JElement): boolean {
	const listType: string = leaf.attributes[TYPE_KEY];
	const listStyle: string = leaf.attributes[STYLE_KEY];

	return !(
		list.name !== listType ||
		list.attributes[STYLE_KEY] !== listStyle ||
		leaf.attributes[LEVEL_KEY] !== list.attributes[LEVEL_KEY]
	);
}
