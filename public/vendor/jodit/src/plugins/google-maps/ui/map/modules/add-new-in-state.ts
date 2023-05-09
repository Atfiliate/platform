/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { UIMap } from '../map';
import type { IGMElement } from '../../../interface';
import { pathToArray } from '../../../helpers/helpers';

export function addNewInState(this: UIMap, mvc: IGMElement): void {
	switch (this.state.mode) {
		case 'polyline':
		case 'polygon': {
			const { mode } = this.state;

			this.state.elements = [
				...this.state.elements,
				{
					type: mode,
					coordinates: pathToArray(
						(mvc as google.maps.Polyline).getPath()
					),
					...this.options.googleMaps.map.defaultStates[mode]
				}
			];
			break;
		}

		case 'circle': {
			const circle = mvc as google.maps.Circle;

			this.state.elements = [
				...this.state.elements,
				{
					type: this.state.mode,
					coordinates: [
						circle.getCenter()?.lat() ?? 0,
						circle.getCenter()?.lng() ?? 0
					],
					radius: circle.getRadius(),
					...this.options.googleMaps.map.defaultStates.circle
				}
			];

			break;
		}

		case 'marker': {
			const marker = mvc as google.maps.Marker;

			this.state.elements = [
				...this.state.elements,
				{
					type: this.state.mode,
					coordinates: [
						marker.getPosition()?.lat() ?? 0,
						marker.getPosition()?.lng() ?? 0
					],
					...this.options.googleMaps.map.defaultStates.marker
				}
			];

			break;
		}
	}
}
