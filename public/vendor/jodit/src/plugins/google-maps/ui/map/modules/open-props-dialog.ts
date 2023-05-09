/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import {
	UIMarkerEditor,
	UIPolygonEditor,
	UIPolylineEditor
} from '../../editors';
import type {
	IMarkerState,
	IPolygonState,
	IPolylineState,
	IUIMapElement
} from '../../../interface';
import type { UIMap } from '../map';
import type { CanUndef, IUIElement } from 'jodit/types';
import { removeElement } from './remove-element';
import { updateStateAndGme } from './update-state-and-gme';

function getInfoWindow(this: UIMap): google.maps.InfoWindow {
	const infoWindow = new google.maps.InfoWindow({
		content: '<div>test</div>'
	});

	infoWindow.addListener('domready', () => {
		this.setMod('info-opened', true);
	});

	infoWindow.addListener('closeclick', () => {
		this.setMod('info-opened', false);
	});

	return infoWindow;
}

export function openPropsDialog(
	this: UIMap,
	newElm: IUIMapElement,
	index: number
): void {
	let editor: CanUndef<IUIElement>;

	this.state.mode = 'hand';

	switch (newElm.type) {
		case 'polyline':
			editor = new UIPolylineEditor(
				this.jodit,
				newElm.state as IPolylineState,
				this.options
			);
			break;

		case 'marker':
			editor = new UIMarkerEditor(
				this.jodit,
				newElm.state as IMarkerState,
				this.options
			);

			break;

		case 'circle':
		case 'polygon':
			editor = new UIPolygonEditor(
				this.jodit,
				newElm.state as IPolygonState,
				this.options
			);

			break;
	}

	if (!editor) {
		return;
	}

	this.append(editor);

	this.j.e
		.on(editor, 'bin', () => {
			removeElement.call(this, newElm);
		})
		.on(editor, 'change', (key: string, value: string) => {
			updateStateAndGme.call(
				this,
				{
					...newElm.state,
					[key]: value
				},
				index
			);
		});

	const w = getInfoWindow.call(this);

	if (newElm.type === 'polygon' || newElm.type === 'polyline') {
		const pos = newElm.gme.getPath().getAt(0);
		w.setPosition(pos);
	}

	if (newElm.type === 'circle') {
		w.setPosition(newElm.gme.getCenter());
	}

	w.setContent(editor.container);
	w.open(this.map, newElm.gme);
	w.addListener('closeclick', () => {
		if (editor) {
			this.remove(editor);
			editor.destruct();
		}
	});
}
