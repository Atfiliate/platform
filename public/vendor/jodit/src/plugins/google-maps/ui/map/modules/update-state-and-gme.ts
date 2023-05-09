/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import type { IPolygonState, IUIMapElement } from '../../../interface';
import type { UIMap } from '../map';
import { arrayToPath } from '../../../helpers/helpers';

export function updateStateAndGme(
	this: UIMap,
	newState: IUIMapElement['state'],
	index: number,
	silent: boolean = false
): void {
	const elm = this.mapElements[index];

	if (elm.state === newState || elm.state.type !== newState.type) {
		return;
	}

	const oldState: typeof newState = elm.state;

	if (!silent) {
		let key: keyof IPolygonState;

		for (key in newState) {
			const newValue = (newState as any)[key];
			const oldValue = (oldState as any)[key];

			if (
				newValue != null &&
				(oldValue == null ||
					newValue.toString() !== oldValue.toString())
			) {
				switch (key) {
					case 'strokeWeight':
					case 'strokeColor':
					case 'fillColor':
					case 'fillOpacity':
						switch (elm.type) {
							case 'polyline':
							case 'circle':
							case 'polygon': {
								elm.gme.setOptions({
									[key]: newValue as string
								});
								break;
							}
						}
						break;

					// For Edit mode
					case 'coordinates':
						switch (elm.type) {
							case 'polygon':
							case 'polyline': {
								elm.gme.setPath(
									arrayToPath(newValue as number[][])
								);
								break;
							}
						}

						break;
				}
			}
		}
	}

	elm.state = newState;
	this.state.elements[index] = newState;
}
