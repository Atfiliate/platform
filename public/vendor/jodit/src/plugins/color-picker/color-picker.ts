/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IJodit } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Dom } from 'jodit/core/dom/dom';
import { ColorInput } from './ui/input/color-input';
import { autobind } from 'jodit/core/decorators';
import { Jodit } from '../../index';

export class colorPicker extends Plugin {
	/** @override */
	override requires = ['license'];

	/** @override */
	override hasStyle = !Jodit.fatMode;

	/** @override */
	protected afterInit(jodit: IJodit): void {
		jodit.e.on('afterGenerateColorPicker', this.onAfterGenerateColorPicker);
	}

	@autobind
	private onAfterGenerateColorPicker(
		ignore: HTMLElement,
		extra: HTMLElement,
		callback: (newColor: string) => void,
		color: string
	): void {
		Dom.detach(extra);

		const ci = new ColorInput(this.j, {
			value: color || '#000',
			onChange: callback
		});

		extra.appendChild(ci.container);
	}

	/** @override */
	protected beforeDestruct(jodit: IJodit): void {
		jodit.e.off(
			'afterGenerateColorPicker',
			this.onAfterGenerateColorPicker
		);
	}
}

Jodit.plugins.add('color-picker', colorPicker);
