/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './maps-props.less';

import { UIForm, UIInput, UISelect } from 'jodit/core/ui';
import type { UIMap } from '../map/map';
import type { IUIMapBaseState } from '../../interface';
import { refs } from 'jodit/core/helpers';
import { component, autobind, watch } from 'jodit/core/decorators';

@component
export class UIMapsPropsForm extends UIForm {
	override className(): string {
		return 'UIMapsPropsForm';
	}

	constructor(jodit: UIForm['jodit'], readonly state: UIMap['state']) {
		super(jodit);

		const [w, h] = state.size;
		const [x, y] = state.center;

		this.append([
			new UIInput(jodit, {
				label: 'Width',
				name: 'width',
				value: w,
				type: 'number',
				onChange: this.onChangeSize
			}),

			new UIInput(jodit, {
				label: 'Height',
				name: 'height',
				value: h,
				type: 'number',
				onChange: this.onChangeSize
			}),

			new UIInput(jodit, {
				label: 'Latitude',
				name: 'lat',
				value: x,
				onChange: this.onChangeCenter
			}),

			new UIInput(jodit, {
				label: 'Longitude',
				name: 'lng',
				value: y,
				onChange: this.onChangeCenter
			}),

			new UISelect(jodit, {
				label: 'Map type',
				value: state.type,
				name: 'mapType',
				options: [
					{ value: 'hybrid', text: 'Hybrid' },
					{ value: 'roadmap', text: 'Roadmap' },
					{ value: 'satellite', text: 'Satellite' },
					{ value: 'terrain', text: 'Terrain' }
				],
				onChange: (value): void => {
					state.type = value as IUIMapBaseState['type'];
				}
			}),

			new UISelect(jodit, {
				label: 'Layer',
				value: state.layer ?? 'default',
				name: 'layer',
				options: [
					{ value: 'default', text: 'Default' },
					{ value: 'traffic', text: 'Traffic' },
					{ value: 'transit', text: 'Transit' },
					{ value: 'bicycling', text: 'Bicycling' }
				],
				onChange: (value): void => {
					state.layer = value as IUIMapBaseState['layer'];
				}
			})
		]);
	}

	@autobind
	private onChangeSize(): void {
		const { width, height } = refs<HTMLInputElement>(this);

		this.state.size = [
			parseInt(width?.value, 10) || 0,
			parseInt(height?.value, 10) || 0
		];
	}

	@watch('state.size')
	protected onExternalChangeSize(): void {
		const { width, height } = refs<HTMLInputElement>(this);
		const [w, h] = this.state.size;

		if (w.toString() !== width.value) {
			width.value = w.toString();
		}

		if (h.toString() !== height.value) {
			height.value = h.toString();
		}
	}

	@autobind
	private onChangeCenter(): void {
		const { lat, lng } = refs<HTMLInputElement>(this);

		this.state.center = [
			parseFloat(lat?.value) || 0,
			parseFloat(lng?.value) || 0
		];
	}

	@watch(['state.center'])
	protected onExternalChangeCenter(): void {
		const { lat, lng } = refs<HTMLInputElement>(this);
		const [x, y] = this.state.center;

		if (x.toString() !== lat.value) {
			lat.value = x.toString();
		}

		if (y.toString() !== lng.value) {
			lng.value = y.toString();
		}
	}

	@watch(['state.type'])
	protected onExternalChangeType(): void {
		const { mapType } = refs<HTMLInputElement>(this);

		if (this.state.type !== mapType.value) {
			mapType.value = this.state.type;
		}
	}

	@watch(['state.layer'])
	protected onExternalChangeLayer(): void {
		const { layer } = refs<HTMLInputElement>(this);

		if (this.state.layer !== layer.value) {
			layer.value = this.state.layer;
		}
	}
}
