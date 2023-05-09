/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { ICaseFn } from '../interface';

export const normalizeImageProps: ICaseFn = (elm) => {
	if (!elm.isElement) {
		return elm;
	}

	if (elm.name === 'img') {
		if (elm.attributes.align) {
			elm.style.add('float', elm.attributes.align);
			elm.attributes.align = null;
		}

		if (elm.attributes.hspace) {
			elm.style.add('marginLeft', elm.attributes.hspace + 'px');
			elm.style.add('marginRight', elm.attributes.hspace + 'px');
			elm.attributes.hspace = null;
		}
	}

	return elm;
};
