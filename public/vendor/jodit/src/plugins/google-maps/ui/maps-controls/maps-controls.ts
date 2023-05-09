/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './maps-controls.less';

import type { IUIMapBaseState } from '../../interface';
import type { UIMap } from '../map/map';
import { UICheckbox, UIForm } from 'jodit/core/ui';
import { component } from 'jodit/core/decorators';

@component
export class UIMapsControlsForm extends UIForm {
	override className(): string {
		return 'UIMapsControlsForm';
	}

	constructor(jodit: UIForm['jodit'], readonly state: UIMap['state']) {
		super(jodit);

		const controlsNames = {
			zoomControl: 'Zoom control',
			mapTypeControl: 'Map Type control',
			scaleControl: 'Scale control',
			streetViewControl: 'Street View control ',
			rotateControl: 'Rotate control',
			fullscreenControl: 'Fullscreen control'
		} as const;

		const controls = Object.keys(controlsNames) as Array<
			keyof IUIMapBaseState['controls']
		>;

		this.append(
			controls.map(
				(key) =>
					new UICheckbox(jodit, {
						label: controlsNames[key],
						name: key,
						checked: this.state.controls[key],
						switch: true,
						type: 'checkbox',
						onChange: this.onChangeSize.bind(this, key)
					})
			)
		);
	}

	private onChangeSize(
		key: keyof IUIMapBaseState['controls'],
		value: string
	): void {
		this.state.controls = {
			...this.state.controls,
			[key]: value === 'true'
		};
	}
}
