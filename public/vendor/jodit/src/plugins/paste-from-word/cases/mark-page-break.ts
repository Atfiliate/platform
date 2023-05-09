/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { ICaseFn } from '../interface';

export const markPageBreakElements: ICaseFn = (elm) => {
	if (
		(elm.isElement && elm.style.get('page-break-before') === 'always') ||
		elm.style.get('break-before') === 'page'
	) {
		elm.attributes['jd-safe'] = true;
		elm.style.add('page-break-before', 'always');

		if (elm.isSingle) {
			elm.name = 'div';
		}
	}

	return elm;
};
