/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { JElement } from '../element';

const REPLACE_OLD_TAGS = {
	i: 'em',
	b: 'strong'
};

export function replaceOldTags(elm: JElement): JElement {
	const { name } = elm;

	if (name in REPLACE_OLD_TAGS) {
		elm.name = (REPLACE_OLD_TAGS as any)[name];
	}

	return elm;
}
