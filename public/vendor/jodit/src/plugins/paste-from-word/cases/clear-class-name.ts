/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { ICaseFn } from '../interface';
import { trim } from 'jodit/src/core/helpers/string/trim';

export const clearClassName: ICaseFn = (elm) => {
	// Normalize or remove class
	if (elm.attributes.class) {
		elm.attributes.class = elm.attributes.class.replace(
			/(el\d+)|(font\d+)|msonormal|msolistparagraph\w*/gi,
			''
		);

		if (!trim(elm.attributes.class)) {
			elm.attributes.class = null;
		}
	}

	return elm;
};
