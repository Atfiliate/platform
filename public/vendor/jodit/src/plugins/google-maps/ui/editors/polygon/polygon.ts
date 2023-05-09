/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IPolygonState } from '../../../interface';
import { component, hook } from 'jodit/core/decorators';
import { ColorInput } from '../../../../color-picker/ui/input/color-input';
import { UIPolylineEditor } from '../polyline/polyline';
import { UIRange } from '../../../../../core/ui/form/range/range';

@component
export class UIPolygonEditor extends UIPolylineEditor<IPolygonState> {
	@hook('ready')
	protected override onReady(): void {
		this.append(
			[
				new ColorInput(this.j, {
					label: 'Fill color',
					value: this.state.fillColor ?? '#000',
					onChange: (value) =>
						this.j.e.fire(this, 'change', 'fillColor', value)
				}).setMod('trigger', false),

				new UIRange(this.j, {
					label: 'Opacity',
					min: 0,
					max: 1,
					value: this.state.fillOpacity ?? 1,
					onChange: (value): void => {
						this.j.e.fire(
							this,
							'change',
							'fillOpacity',
							parseFloat(value) || 0
						);
					}
				}).setMod('log', false)
			],
			'form'
		);
	}
}
