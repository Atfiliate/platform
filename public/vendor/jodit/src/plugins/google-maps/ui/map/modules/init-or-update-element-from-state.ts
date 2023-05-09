/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import type {
	IGMElement,
	IUIMapElement,
	IUIMapElementState
} from '../../../interface';
import type { UIMap } from '../map';
import { updateStateAndGme } from './update-state-and-gme';
import { Icon } from 'jodit/core/ui';
import { arrayToPath } from '../../../helpers/helpers';
import { uniqueUid } from 'jodit/core/global';
import { onChangeGeometries } from './on-change-geometries';
import { openPropsDialog } from './open-props-dialog';

export function initOrUpdateElementFromState(
	this: UIMap,
	state: IUIMapElementState,
	index: number
): void {
	const elm = this.mapElements[index];

	if (elm) {
		if (elm.state.type === state.type) {
			return updateStateAndGme.call(this, state, index);
		}

		elm.gme.setMap(null);
	}

	let gme: IGMElement;

	switch (state.type) {
		case 'text':
			gme = new google.maps.Marker({
				position: new google.maps.LatLng(
					state.coordinates[0],
					state.coordinates[1]
				),
				draggable: true,
				title: state.text,
				map: this.map
			});
			break;

		case 'marker':
			gme = new google.maps.Marker({
				position: new google.maps.LatLng(
					state.coordinates[0],
					state.coordinates[1]
				),
				draggable: true,
				label: state.showCaption ? state.title : '',
				title: state.title,
				icon: state.icon ? Icon.get(state.icon) : null,
				map: this.map
			});
			break;

		case 'polyline':
		case 'polygon':
			{
				const coordinates = arrayToPath(state.coordinates);

				gme = new google.maps[
					state.type === 'polygon' ? 'Polygon' : 'Polyline'
				]({
					path: coordinates,
					strokeColor: state.strokeColor,
					fillColor: state.fillColor,
					strokeWeight: state.strokeWeight,
					editable: true,
					draggable: true,
					map: this.map,
					fillOpacity:
						state.type === 'polygon' ? state.fillOpacity : 1
				});
			}
			break;

		case 'circle':
			gme = new google.maps.Circle({
				center: new google.maps.LatLng(
					state.coordinates[0],
					state.coordinates[1]
				),
				radius: state.radius,
				strokeColor: state.strokeColor,
				fillColor: state.fillColor,
				strokeWeight: state.strokeWeight,
				editable: true,
				draggable: true,
				map: this.map,
				fillOpacity: state.fillOpacity ?? 1
			});

			break;
	}

	const newElm = {
		type: state.type,
		uid: uniqueUid(),
		state,
		gme
	} as IUIMapElement;

	'dragend radius_changed center_changed'
		.split(' ')
		.forEach((event) =>
			gme.addListener(event, () =>
				onChangeGeometries.call(this, newElm, index)
			)
		);

	if (newElm.type === 'polygon' || newElm.type === 'polyline') {
		'insert_at set_at remove_at'
			.split(' ')
			.forEach((event) =>
				newElm.gme
					.getPath()
					.addListener(event, () =>
						onChangeGeometries.call(this, newElm, index)
					)
			);
	}

	gme.addListener('click', () => openPropsDialog.call(this, newElm, index));

	this.mapElements[index] = newElm;
}
