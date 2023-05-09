/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import type { IJodit } from 'jodit/types';
import type { IUIMapState } from '../interface';
import { ucfirst } from 'jodit/core/helpers';

export function generateJSScript(jodit: IJodit, state: IUIMapState): string {
	return `<${'script'} class="jodit-google-maps-init" type="text/javascript">
		var imgMap = document.getElementById('${state.uid}'),
			box = document.createElement('div'),
			mapBox = document.createElement('div'),
			parentBox = imgMap && imgMap.parentNode,
			assign = Object.assign || function (a, b) {
				return Object.keys(b).reduce(function(acc, key) {
					acc[key] = b[key];
					return acc;
				}, a)
			};

		box.id = 'b${state.uid}';
		parentBox ? parentBox.insertBefore(box, imgMap) : document.body.appendChild(box);
		imgMap && box.appendChild(imgMap);
		box.appendChild(mapBox);

		if (parentBox && parentBox.style.textAlign === 'center') {
			parentBox.style.margin = '0 auto';
		}

		box.style.cssText = imgMap.style.cssText;
		box.className = imgMap.className;

		var w = (imgMap && imgMap.offsetWidth) || ${state.size[0]},
				h = (imgMap && imgMap.offsetHeight) || ${state.size[1]};

		assign(box.style, {
			display: !imgMap.style.cssText ? 'inline-block' : undefined,
			width: w + 'px',
			height: h + 'px',
			position: 'relative'
		});

		assign(mapBox.style, {
			width: w + 'px',
			height: h + 'px',
			position: 'absolute',
			left: 0,
			top: 0
		});

		function CreateGMap${state.uid}() {
			if (!mapBox) {
				return;
			}

			var map = new google.maps.Map(mapBox, assign({
				zoom: ${state.zoom},
				center: { lat: ${state.center[0]}, lng: ${state.center[1]}},
				mapType: '${state.type}'
			}, ${JSON.stringify(state.controls)}));

			if (${state.layer !== 'default'}) {
				new google.maps.${ucfirst(state.layer)}Layer().setMap(map);
			}

			var infoWindow = new google.maps.InfoWindow();

			${JSON.stringify(state.elements)}.forEach(function (elm) {
				switch (elm.type) {
					case 'marker': {
						var obj = (new google.maps.Marker({
							position: {lat: elm.coordinates[0], lng: elm.coordinates[1]},
							map: map,
							title: elm.title
						}));

						elm.text && obj.addListener('click', function () {
							infoWindow.setContent(elm.text);
							infoWindow.open(map, this);
						});
						break;
					}

					case 'circle': {
						(new google.maps.Circle({
							center: {lat: elm.coordinates[0], lng: elm.coordinates[1]},
							radius: elm.radius,
							strokeColor: elm.strokeColor,
							fillColor: elm.fillColor,
							strokeWeight: elm.strokeWeight,
							fillOpacity: elm.fillOpacity,
							map: map,
						}));
						break;
					}

					case 'polygon':
					case 'polyline': {
						function toPath(array) {
							return array.map(function (item) {
								if (Array.isArray(item[0])) {
									return toPath(item);
								}

								return {lat: item[0], lng: item[1]};
							})
						}

						(new google.maps[elm.type === 'polyline' ? 'Polyline' : 'Polygon']({
							path: toPath(elm.coordinates),
							strokeColor: elm.strokeColor,
							fillColor: elm.fillColor,
							strokeWeight: elm.strokeWeight,
							fillOpacity: elm.fillOpacity,
							map: map,
						}));
						break;
					}
				}
			})
		}

		if (typeof google !== 'undefined' && typeof google.maps !=='undefined' && typeof google.maps.Map !== 'undefined') {
			CreateGMap${state.uid}();
		} else {
			var scr = document.createElement('script');
			scr.src = 'https://maps.googleapis.com/maps/api/js?key=${
				// @ts-ignore
				jodit.o.googleMaps.API_KEY
			}&language=${jodit.o.language}&callback=CreateGMap${state.uid}';
			document.appendChild(scr);
		}
		/*]]>*/</${'script'}>`.replace(/[\n\t]+/g, '');
}
