/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './map.less';
import type { IJodit, Nullable } from 'jodit/types';
import type {
	CreateMode,
	IUIMapElement,
	IUIMapState,
	IUIMapBaseState
} from '../../interface';
import { UIElement, UIGroup } from 'jodit/core/ui';
import { hook, watch, debounce, wait } from 'jodit/core/decorators';
import { css } from 'jodit/core/helpers';
import { ToolbarCollection } from 'jodit/modules';
import { STORAGE_KEY } from '../../helpers/const';
import { initOrUpdateElementFromState } from './modules/init-or-update-element-from-state';
import { uniqueUid } from 'jodit/core/global';
import '../../config';
import { addNewInState } from './modules';
import type { IGMElement } from '../../interface';
import { assert } from 'jodit/src/core/helpers';

export class UIMap extends UIGroup {
	private drawingManager?: google.maps.drawing.DrawingManager;

	override className(): string {
		return 'UIMap';
	}

	private toolbar = new ToolbarCollection(this.jodit);

	state: IUIMapState = {
		uid: 'jd' + uniqueUid() + new Date().toString().replace(/[^0-9]/g, ''),
		layer: this.options.googleMaps.map.layer,
		center: this.options.googleMaps.map.defaultCenter,
		zoom: this.options.googleMaps.map.defaultZoom,
		size: this.options.googleMaps.map.size,
		type: this.options.googleMaps.map.type,
		controls: {
			zoomControl: true,
			mapTypeControl: true,
			scaleControl: true,
			streetViewControl: true,
			rotateControl: true,
			fullscreenControl: true
		},
		mode: 'hand',
		elements: []
	};

	json(): string {
		return JSON.stringify({ ...this.state, mode: 'hand' });
	}

	protected mapElements: IUIMapElement[] = [];

	private apiLoaded: Nullable<Promise<unknown>> = null;
	private mapInitialized: boolean = false;

	map!: google.maps.Map;

	@hook('ready')
	protected async onReady(): Promise<void> {
		await this.apiLoaded;

		const container = this.getElm('map-root');

		assert(container != null, 'map-root element does not exists');

		this.map = new google.maps.Map(container, {
			center: { lat: this.state.center[0], lng: this.state.center[1] },
			zoom: this.state.zoom,
			mapTypeId: this.state.type
		});

		this.map.addListener('zoom_changed', () => {
			this.state.zoom = this.map.getZoom() ?? 10;
		});

		this.map.addListener('center_changed', () => {
			this.state.center = [
				this.map?.getCenter()?.lat() ?? 55,
				this.map?.getCenter()?.lng() ?? 34
			];
		});

		this.map.addListener('maptypeid_changed', () => {
			const type = this.map.getMapTypeId();

			if (type) {
				this.state.type = type as IUIMapBaseState['type'];
			}
		});

		this.initDrawManager();
		this.onChangeElementsList();
		this.onChangeSize();
		this.onChangeControls();
		this.onChangeLayer();
		this.onChangeMapType();
		this.onChangeMode();

		this.mapInitialized = true;

		this.j.async.requestIdleCallback(() => {
			this.j.e.fire(this, 'GoogleMapsIsReady');
		});
	}

	private initDrawManager(): void {
		try {
			const drawingManager = new google.maps.drawing.DrawingManager();

			drawingManager.setMap(this.map);
			drawingManager.setOptions({
				drawingControl: false,
				polygonOptions: {
					...this.options.googleMaps.map.defaultStates.polygon,
					clickable: true,
					editable: true
				},
				polylineOptions: {
					...this.options.googleMaps.map.defaultStates.polyline,
					clickable: true,
					editable: true
				},
				markerOptions: {
					...this.options.googleMaps.map.defaultStates.marker,
					clickable: true
				},
				circleOptions: {
					...this.options.googleMaps.map.defaultStates.circle,
					clickable: true,
					editable: true
				}
			});

			this.drawingManager = drawingManager;

			google.maps.event.addListener(
				drawingManager,
				'overlaycomplete',
				(event: google.maps.drawing.OverlayCompleteEvent) => {
					if (event.overlay) {
						addNewInState.call(this, event.overlay as IGMElement);
						event.overlay.setMap(null);
					}
				}
			);
		} catch {}
	}

	@watch('?:changeCreateMode.gm')
	protected changeCreateMode(mode: CreateMode): void {
		this.state.mode = this.state.mode === mode ? 'hand' : mode;
	}

	@watch('state.mode')
	protected onChangeMode(): void {
		this.j.buffer.set('createMode.gm', this.state.mode);

		this.drawingManager?.setDrawingMode(
			this.state.mode === 'hand'
				? null
				: (this.state.mode as google.maps.drawing.OverlayType)
		);

		this.j.e.fire('updateToolbar');
	}

	@watch('state.elements')
	protected onChangeElementsList(): void {
		const {
			state: { elements },
			mapElements
		} = this;

		if (elements.length < mapElements.length) {
			mapElements.slice(elements.length).forEach((elm) => {
				elm.gme.setMap(null);
			});
		}

		mapElements.length = elements.length;

		elements.forEach((state, index) =>
			initOrUpdateElementFromState.call(this, state, index)
		);
	}

	@watch('state.center')
	@wait((ctx: UIMap) => ctx.mapInitialized)
	@debounce()
	protected onChangeCenter(): void {
		const center = this.map.getCenter();

		if (
			center?.lat() !== this.state.center[0] ||
			center?.lng() !== this.state.center[1]
		) {
			this.map.setCenter({
				lat: this.state.center[0],
				lng: this.state.center[1]
			});
		}
	}

	@watch('state.zoom')
	@debounce()
	protected onChangeZoom(): void {
		this.map?.setZoom(this.state.zoom);
	}

	@watch('state.controls')
	protected onChangeControls(): void {
		let key: keyof IUIMapState['controls'];

		for (key in this.state.controls) {
			this.map?.set(key, this.state.controls[key]);
		}
	}

	@watch([
		'state.center',
		'state.zoom',
		'state.controls',
		'state.size',
		'state.type',
		'state.layer'
	])
	@wait((ctx: UIMap) => ctx.mapInitialized)
	@debounce()
	protected onChangeBound(): void {
		this.options.googleMaps.saveStateInStorage &&
			this.j.storage.set(STORAGE_KEY, {
				center: this.state.center,
				size: this.state.size,
				zoom: this.state.zoom,
				type: this.state.type,
				layer: this.state.layer,
				controls: this.state.controls
			});
	}

	@watch('state.size')
	@debounce()
	protected onChangeSize(): void {
		const mapSize = this.getElm('map-size');
		assert(mapSize != null, 'map-size element does not exists');

		css(mapSize, {
			width: this.state.size[0],
			height: this.state.size[1]
		});
	}

	@watch('state.type')
	protected onChangeMapType(): void {
		this.map.setMapTypeId(this.state.type);
	}

	private layers: Array<{ setMap(map: google.maps.Map | null): void }> = [];

	@watch('state.layer')
	protected onChangeLayer(): void {
		this.layers.forEach((layer) => layer.setMap(null));
		this.layers.length = 0;

		switch (this.state.layer) {
			case 'traffic':
				this.layers.push(new google.maps.TrafficLayer());
				break;

			case 'transit':
				this.layers.push(new google.maps.TransitLayer());
				break;

			case 'bicycling':
				this.layers.push(new google.maps.BicyclingLayer());
				break;
		}

		this.layers.forEach((layer) => layer.setMap(this.map));
	}

	protected override render(): string {
		return `<div>
			<div class='&__map-root'></div>
			<div class='&__map-size'></div>
			<div class='&__map-palette'></div>
		</div>`;
	}

	protected override appendChildToContainer(): void {}

	constructor(
		jodit: UIElement['jodit'],
		state: Partial<IUIMapState>,
		override readonly options: IJodit['options']
	) {
		super(jodit);
		Object.assign(this.state, state);

		this.toolbar.build([
			'gm.hand',
			'gm.marker',
			'gm.polyline',
			'gm.polygon',
			'gm.circle'
			// 'gm.text'
		]);

		const palette = this.getElm('map-palette');
		assert(palette != null, 'palette element does not exists');
		palette.appendChild(this.toolbar.container);
	}
}
