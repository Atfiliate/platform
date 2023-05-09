/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './range.less';

import { UIInput } from 'jodit/core/ui';
import type { IUIRange } from 'jodit/types';
import { component, watch } from 'jodit/core/decorators';
import { assert, css } from 'jodit/core/helpers';
import autobind from 'autobind-decorator';

@component
export class UIRange extends UIInput implements IUIRange {
	override state: IUIRange['state'] = {
		...UIInput.defaultState,
		min: 0,
		max: 100
	};

	/** @override */
	override className(): string {
		return 'UIRange';
	}

	constructor(jodit: UIInput['jodit'], options: Partial<IUIRange['state']>) {
		super(jodit, {
			...options,
			type: 'hidden'
		});

		Object.assign(this.state, options);

		this.appendUIRange();
		this.onChangeSelfValue();
	}

	private appendUIRange(): void {
		const slider = this.j.create.div(this.getFullElName('slider'));
		this.container.appendChild(slider);
		const handle = this.j.create.div(this.getFullElName('handle'));
		slider.appendChild(handle);

		const log = this.j.create.div(this.getFullElName('log'));

		const label = this.getElm('label');
		assert(label != null, 'label element does not exists');
		label.appendChild(log);
	}

	private startValue: number = 0;
	private startX: number = 0;
	private width: number = 100;

	@watch(['handle:mousedown', 'handle:touchstart'])
	protected onDragStart(e: MouseEvent): void {
		this.startValue = parseFloat(this.value) || 0;
		this.startX = e.clientX;
		const slider = this.getElm('slider');
		assert(slider != null, 'slider element does not exists');
		this.width = slider.offsetWidth;
		this.j.e.on(this.j.ow, 'mousemove', this.onDrag);
	}

	@autobind
	protected onDrag(e: MouseEvent): void {
		const { min, max } = this.state;

		const diff =
			((e.clientX - this.startX) / this.width) *
			(this.state.max - this.state.min);

		let value = this.startValue + diff;

		if (value < min) {
			value = min;
		}

		if (value > max) {
			value = max;
		}

		this.value = value.toString();
	}

	@watch(['j.ow:mouseup', 'j.ow:touchend'])
	protected onDragEnd(): void {
		this.j.e.off(this.j.ow, 'mousemove', this.onDrag);
	}

	@watch(':change')
	protected onChangeSelfValue(): void {
		const handle = this.getElm('handle'),
			value = parseFloat(this.value) || 0;

		assert(handle != null, 'Handle element does not exist');

		css(handle, {
			left:
				((value - this.state.min) / (this.state.max - this.state.min)) *
					100 +
				'%'
		});

		const log = this.getElm('log');
		assert(log != null, 'log element does not exist');

		log.innerText = value.toString();
	}

	override destruct(): any {
		this.onDragEnd();
		return super.destruct();
	}
}
