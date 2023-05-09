/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { UIMap } from '../ui';
import { generateStaticElements } from './generate-static-elements';

export function staticUrl(uiMap: UIMap): string {
	const { state } = uiMap;

	return (
		`https://maps.googleapis.com/maps/api/staticmap?center=${state.center.join(
			','
		)}` +
		`&zoom=${state.zoom}` +
		`&size=${state.size.join('x')}` +
		`&maptype=${state.type}` +
		`&key=${uiMap.options.googleMaps.API_KEY}` +
		generateStaticElements(uiMap)
	);
}
