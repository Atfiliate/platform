/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { UIMap } from '../ui';
import { arrayToPath, specialColor } from './helpers';
import { stripTags } from 'jodit/core/helpers';

export function generateStaticElements(uiMap: UIMap): string {
	return uiMap.state.elements
		.map((elm) => {
			switch (elm.type) {
				case 'polygon':
					return `&path=fillcolor:${specialColor(
						elm.fillColor ?? '#fff'
					)}%7Cweight:${elm.strokeWeight ?? 1}%7Ccolor:${specialColor(
						elm.strokeColor ?? '#fff'
					)}%7Cenc:${google.maps.geometry.encoding.encodePath(
						arrayToPath(elm.coordinates)
					)}`;

				case 'polyline':
					return `&path=weight:${
						elm.strokeWeight ?? 1
					}%7Ccolor:${specialColor(
						elm.strokeColor ?? '#fff'
					)}%7Cenc:${google.maps.geometry.encoding.encodePath(
						arrayToPath(elm.coordinates)
					)}`;

				case 'marker':
					return `&markers=color:blue%7Clabel:${encodeURIComponent(
						stripTags(elm.text ?? '')
							.charAt(0)
							.toUpperCase()
					)}%7C${elm.coordinates}`;
			}

			return '';
		})
		.join('');
}
