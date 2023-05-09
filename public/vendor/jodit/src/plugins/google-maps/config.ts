/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IControlType, IViewBased } from 'jodit/types';
import type {
	ICircleState,
	IMarkerState,
	IPolygonState,
	IPolylineState,
	ITextState,
	IUIMapBaseState
} from './interface';
import { Config } from 'jodit/config';
import { COMMAND_OPEN_DIALOG } from './helpers/const';

declare module 'jodit/config' {
	interface Config {
		googleMaps: {
			saveStateInStorage: boolean;
			useStaticImage: boolean;

			apiUrl: string;

			API_KEY: string;

			inlineEditorOptions: Partial<Config>;

			dialog: {
				size: [number, number];
			};

			map: {
				center: 'auto' | [number, number];
				type: IUIMapBaseState['type'];
				layer: IUIMapBaseState['layer'];
				defaultCenter: IUIMapBaseState['center'];
				defaultZoom: number;
				zoom: number;
				size: [number, number];

				defaultStates: {
					circle: Partial<ICircleState>;
					polygon: Partial<IPolygonState>;
					polyline: Partial<IPolylineState>;
					marker: Partial<IMarkerState>;
					text: Partial<ITextState>;
				};
			};
		};
	}
}

Config.prototype.googleMaps = {
	saveStateInStorage: true,
	useStaticImage: false,

	apiUrl: 'https://maps.googleapis.com/maps/api/js?key=${j.o.googleMaps.API_KEY}&libraries=geometry,places,drawing&language=${j.o.language}&callback=JoditGoogleReadyHandler',

	API_KEY: 'AIzaSyDjnR03hxN8fo0QJ85Jkkvk2DALTh3eynY', // Do not use this Key in production

	dialog: {
		size: [700, 700]
	},

	inlineEditorOptions: {
		buttons: ['bold', 'italic', 'link', 'brush', 'fontsize', 'image']
	},

	map: {
		type: 'roadmap',
		layer: 'default',
		center: 'auto',
		defaultCenter: [-34.397, 150.644],
		defaultZoom: 10,
		zoom: 10,
		size: [500, 400],

		defaultStates: {
			polyline: {
				strokeColor: '#5ba4f3',
				strokeWeight: 3
			},
			polygon: {
				strokeColor: '#417706',
				fillColor: '#5b9302',
				strokeWeight: 1,
				fillOpacity: 0.5
			},
			marker: {},
			text: {},
			circle: {
				strokeColor: '#da767c',
				fillColor: '#f34ca8',
				strokeWeight: 1,
				fillOpacity: 0.5
			}
		}
	}
};

Config.prototype.controls.googleMaps = {
	tooltip: 'Google Maps',
	icon: 'map',
	command: COMMAND_OPEN_DIALOG
};

const gmButton = <T extends IViewBased>(name: string): IControlType<T> => ({
	icon: `edit-${name}`,
	isActive: (editor: T): boolean =>
		editor.buffer.get('createMode.gm') === name,
	exec: (editor: T): void => {
		editor.e.fire('changeCreateMode.gm', name);
	}
});

Config.prototype.controls.gm = {
	hand: gmButton('hand'),
	marker: gmButton('marker'),
	polyline: gmButton('polyline'),
	polygon: gmButton('polygon'),
	circle: gmButton('circle'),
	text: gmButton('text')
};
