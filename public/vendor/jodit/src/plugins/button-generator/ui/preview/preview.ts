/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import './preview.less';

import type { IDictionary } from 'jodit/types';

import { UIElement } from 'jodit/core/ui';
import { UIGButton } from '../button/button';
import { component } from 'jodit/core/decorators';
import { ColorInput } from '../../../color-picker/ui/input/color-input';
import { assert } from 'jodit/src/core/helpers';

@component
export class UIPreviewButtonGenerator extends UIElement {
	/** @override */
	override className(): string {
		return 'UIPreviewButtonGenerator';
	}

	private button = new UIGButton(this.j, this.state);

	private lockUpdate = false;

	private colors = [
		'bgStart',
		'bgEnd',
		'fontColor',
		'borderColor',
		'boxShadowColor',
		'textShadowColor',
		'previewBgColor'
	].map((key) => {
		return new ColorInput(this.j, {
			name: key,
			onChange: (value): void => {
				if (!this.lockUpdate) {
					if (key === 'bgEnd' && value !== this.state.bgStart) {
						this.updateState('solid', false);
					}

					this.updateState(key, value);
				}
			}
		}).setMod('slim', true);
	});

	/** @override */
	override render(): string {
		return `<div>
			<div class='&__button'></div>
			<div class='&__colors'></div>
		</div>`;
	}

	override update(): void {
		this.button.update();
		this.lockUpdate = true;
		this.colors.forEach((input) => {
			if (input.value !== this.state[input.state.name]) {
				input.value = this.state[input.state.name];
			}
		});
		this.lockUpdate = false;
	}

	/** @override */
	constructor(
		jodit: UIElement['jodit'],
		readonly state: IDictionary,
		readonly updateState: (
			name: string,
			value: boolean | string | number
		) => void
	) {
		super(jodit);
		this.setMod('mode', 'default');
		const button = this.getElm('button');
		assert(button != null, 'button element does not exists');

		button.appendChild(this.button.container);

		const colors = this.getElm('colors');
		assert(colors != null, 'colors element does not exists');

		this.colors.forEach((input) => {
			colors.appendChild(input.container);
		});

		this.update();
	}
}
