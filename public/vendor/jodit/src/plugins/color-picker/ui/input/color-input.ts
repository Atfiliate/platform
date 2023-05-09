/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './color-input.less';

import type {
	IPopup,
	IUIButton,
	IUIInput,
	IViewBased,
	ModType
} from 'jodit/types';
import { Button, Popup, UIInput } from 'jodit/core/ui';
import { component, watch } from 'jodit/core/decorators';
import { position } from 'jodit/core/helpers';
import * as AColorPicker from 'a-color-picker';
import { Dialog } from 'jodit/modules';
import { KEY_ESC } from 'jodit/core/constants';
import { assert } from 'jodit/src/core/helpers';

@component
export class ColorInput extends UIInput {
	/** @override */
	override className(): string {
		return 'ColorInput';
	}

	private trigger!: IUIButton;

	private popup: IPopup;

	/** @override */
	constructor(jodit: IViewBased, options?: Partial<IUIInput['state']>) {
		super(jodit, options);

		const popup = new Popup(jodit),
			parse = (c: string): string => AColorPicker.parseColor(c, 'hex');

		this.popup = popup;

		this.trigger = Button(this.j, 'ok');
		const wrapper = this.getElm('wrapper');
		assert(wrapper != null, 'wrapper element does not exist');
		wrapper.appendChild(this.trigger.container);

		this.trigger.container.classList.add(this.getFullElName('trigger'));

		this.trigger.onAction(() => {
			this.state.onChange?.(this.value);
			popup.close();
		});

		popup.setMod('padding', false).setMod('max-height', false);

		const pickerElement = this.j.create.div(this.getFullElName('picker'));

		const picker = AColorPicker.createPicker(pickerElement, {
			paletteEditable: true,
			showAlpha: true,
			palette: 'PALETTE_MATERIAL_CHROME'
		}).on('change', (picker: any, color?: string) => {
			if (!this.isFocused) {
				this.value = AColorPicker.parseColor(color || '', 'hex');
			}
		});

		this.j.e.on(this, 'change', () => {
			if (parse(this.value) !== picker.color) {
				picker.color = this.value;
			}
		});

		popup.setContent(pickerElement);

		this.j.e.on(this.nativeInput, 'click', () => {
			popup.parentElement = this;

			if (this.jodit instanceof Dialog) {
				popup.setZIndex(this.jodit.getZIndex() + 1);
			}

			popup.open(() => position(this.container));
		});

		this.onChangeValue();
		this.onChangeSelfValue();
	}

	afterSetMode(name: string, value: ModType): void {
		if (name === 'slim' && value) {
			this.nativeInput.setAttribute('readonly', 'true');
		}
	}

	@watch(':change')
	protected onChangeSelfValue(): void {
		this.nativeInput.style.backgroundColor = this.value;
	}

	@watch('nativeInput:keydown')
	protected onEscKeyDown(e: KeyboardEvent): void {
		if (e.key === KEY_ESC) {
			this.popup?.close();
		}
	}
}
