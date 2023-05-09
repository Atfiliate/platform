/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

export let jdGoogleMapsAlreadyLoaded: boolean = false;
export const jdGoogleMapsOnloadHandlers: Array<Function> = [];

export function googleReady(callback: Function): void {
	if (jdGoogleMapsAlreadyLoaded) {
		callback();
	} else {
		jdGoogleMapsOnloadHandlers.push(callback);
	}
}

export function GoogleReadyHandler(): void {
	jdGoogleMapsAlreadyLoaded = true;

	if (jdGoogleMapsOnloadHandlers) {
		jdGoogleMapsOnloadHandlers.forEach((callback) => callback());
	}
}

export function arrayToPath(
	array: number[] | number[][],
	likePlainObject: boolean = false
): any {
	const path: Array<Array<google.maps.LatLng> | google.maps.LatLng> = [];

	if (Array.isArray(array)) {
		if (Array.isArray(array[0]) || Array.isArray(array[1])) {
			(array as number[][]).forEach((item: number[]) => {
				path.push(arrayToPath(item, likePlainObject));
			});
		} else {
			return !likePlainObject
				? new google.maps.LatLng(array[0], array[1])
				: {
						lat: array[0],
						lng: array[1]
				  };
		}
	}

	return path;
}

export function pathToArray(path: google.maps.MVCArray<any>): number[][] {
	return path.getArray().map((p: google.maps.LatLng) => [p.lat(), p.lng()]);
}

export function specialColor(value: string): string {
	return value.toUpperCase().replace('#', '0x').padEnd(10, 'F');
}

export function isApiAvailable(): boolean {
	return (
		typeof google !== 'undefined' &&
		typeof google.maps !== 'undefined' &&
		typeof google.maps.Map !== 'undefined'
	);
}
