/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IPolylineState } from '../../../interface';
import { component, hook } from 'jodit/core/decorators';
import { UIBaseEditor } from '../base';
import { ColorInput } from '../../../../color-picker/ui/input/color-input';
import { UIInput } from 'jodit/core/ui';

@component
export class UIPolylineEditor<
	T extends Omit<IPolylineState, 'type'>
> extends UIBaseEditor<T> {
	@hook('ready')
	protected override onReady(): void {
		super.onReady();

		this.append(
			[
				new UIInput(this.j, {
					label: 'Stroke weight',
					value: this.state.strokeWeight ?? 1,
					type: 'number',
					onChange: (value) =>
						this.j.e.fire(this, 'change', 'strokeWeight', value)
				}),
				new ColorInput(this.j, {
					label: 'Stroke color',
					value: this.state.strokeColor ?? '#000',
					onChange: (value) =>
						this.j.e.fire(this, 'change', 'strokeColor', value)
				}).setMod('trigger', false)
			],
			'form'
		);
	}
}
