/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

export type MapElementType =
	| 'circle'
	| 'marker'
	| 'polyline'
	| 'polygon'
	| 'text';

export type CreateMode = 'hand' | MapElementType;

interface IMarkerState {
	readonly type: 'marker';
	readonly coordinates: [number, number];
	readonly showCaption?: boolean;
	readonly title?: string;
	readonly text?: string;
	readonly icon?: string;
}

interface IPolylineState {
	readonly type: 'polyline';
	readonly coordinates: number[][];
	readonly strokeColor?: string;
	readonly strokeWeight?: number;
	readonly fillColor?: string;
}

interface IPolygonState {
	readonly type: 'polygon';
	readonly coordinates: number[][];
	readonly strokeColor?: string;
	readonly fillColor?: string;
	readonly strokeWeight?: number;
	readonly fillOpacity?: number;
}

interface ICircleState {
	readonly type: 'circle';
	readonly coordinates: [number, number];
	readonly radius: number;
	readonly strokeColor?: string;
	readonly fillColor?: string;
	readonly strokeWeight?: number;
	readonly fillOpacity?: number;
}

interface ITextState {
	readonly type: 'text';
	readonly coordinates: [number, number];
	readonly text: string;
	readonly size: number;
	readonly color?: string;
}

export type IUIMapElementState =
	| IMarkerState
	| IPolylineState
	| IPolygonState
	| ICircleState
	| ITextState;

export type IGMElement =
	| google.maps.Marker
	| google.maps.Polygon
	| google.maps.Polyline
	| google.maps.Circle;

export type IUIMapElement =
	| {
			readonly uid: string;
			readonly type: 'marker';
			readonly gme: google.maps.Marker;
			state: IMarkerState;
	  }
	| {
			readonly uid: string;
			readonly type: 'polygon';
			readonly gme: google.maps.Polygon;
			state: IPolygonState;
	  }
	| {
			readonly uid: string;
			readonly type: 'polyline';
			readonly gme: google.maps.Polyline;
			state: IPolylineState;
	  }
	| {
			readonly uid: string;
			readonly type: 'circle';
			readonly gme: google.maps.Circle;
			state: ICircleState;
	  }
	| {
			readonly uid: string;
			readonly type: 'text';
			readonly gme: google.maps.Marker;
			state: ITextState;
	  };

export interface IUIMapBaseState {
	uid: string;
	center: [number, number];
	size: [number, number];
	zoom: number;
	type: 'hybrid' | 'roadmap' | 'satellite' | 'terrain';
	layer: 'default' | 'traffic' | 'transit' | 'bicycling';
	controls: {
		zoomControl: boolean;
		mapTypeControl: boolean;
		scaleControl: boolean;
		streetViewControl: boolean;
		rotateControl: boolean;
		fullscreenControl: boolean;
	};
}

export interface IUIMapState extends IUIMapBaseState {
	mode: CreateMode;
	elements: IUIMapElementState[];
}
