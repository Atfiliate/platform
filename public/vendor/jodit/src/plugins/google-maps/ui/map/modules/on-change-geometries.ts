/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type {
	ICircleState,
	IMarkerState,
	IPolygonState,
	IPolylineState,
	IUIMapElement
} from '../../../interface';
import type { UIMap } from '../map';
import { updateStateAndGme } from './update-state-and-gme';
import { pathToArray } from '../../../helpers/helpers';

export function onChangeGeometries(
	this: UIMap,
	newElm: IUIMapElement,
	index: number
): void {
	switch (newElm.type) {
		case 'polyline':
		case 'polygon': {
			const coordinates = pathToArray(newElm.gme.getPath()),
				newState: IPolylineState | IPolygonState = {
					...newElm.state,
					coordinates
				};

			updateStateAndGme.call(this, newState, index, true);
			break;
		}

		case 'marker': {
			const pos = newElm.gme.getPosition(),
				newState: IMarkerState = {
					...newElm.state,
					coordinates: [pos?.lat() ?? 0, pos?.lng() ?? 0]
				};

			updateStateAndGme.call(this, newState, index, true);
			break;
		}

		case 'circle': {
			const pos = newElm.gme.getCenter(),
				newState: ICircleState = {
					...newElm.state,
					radius: newElm.gme.getRadius(),
					coordinates: [pos?.lat() ?? 0, pos?.lng() ?? 0]
				};

			updateStateAndGme.call(this, newState, index, true);
			break;
		}
	}
}
