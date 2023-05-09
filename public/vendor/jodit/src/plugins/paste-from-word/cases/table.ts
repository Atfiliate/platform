/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { ICaseFn } from '../interface';

export const removeWidthFromTableCell: ICaseFn = (elm) => {
	if (elm.attributes.width && (elm.name === 'th' || elm.name === 'td')) {
		elm.attributes.width = null;
	}

	return elm;
};
