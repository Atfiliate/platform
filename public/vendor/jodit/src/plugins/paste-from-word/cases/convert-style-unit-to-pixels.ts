/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { ICaseFn } from '../interface';
import { convertUnitToPx } from '../helpers';

export const convertStyleUnitToPixels: ICaseFn = (elm, { jodit }) => {
	if (!jodit.o.pasteFromWord.convertUnitsToPixel) {
		return elm;
	}

	const { style } = elm;

	style.forEach((key) => {
		const v = style.get(key);
		if (v) {
			style.set(
				key,
				v
					.toString()
					.replace(
						/\d+(\.\d+)?(pt|cm)/g,
						(match: string) => convertUnitToPx(match) + 'px'
					)
			);
		}
	});

	return elm;
};
