/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { JElement } from '../element';

const forbiddenStyles = {
	'text-justify': ['inter-ideograph']
} as const;

export function cleanStyles(elm: JElement): JElement {
	if (elm.isElement && elm.attributes.style) {
		Object.keys(forbiddenStyles).forEach((key) => {
			const values = forbiddenStyles[key as keyof typeof forbiddenStyles];
			if (elm.style.has(key)) {
				// @ts-ignore
				if (values.includes(elm.style.get(key)!.toString())) {
					elm.style.set(key, null);
				}
			}
		});
	}

	return elm;
}
