/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import './keyboard.less';
import type { IJodit } from 'jodit/types';
import { Icon, UIElement } from 'jodit/core/ui';
import { component, hook, watch } from 'jodit/core/decorators';
import { attr } from 'jodit/core/helpers/utils';
import { NBSP_SPACE } from 'jodit/core/constants';
import autobind from 'autobind-decorator';

@component
export class UIKeyboard extends UIElement<IJodit> {
	/** @override */
	className(): string {
		return 'UIKeyboard';
	}

	state = {
		caps: false,
		shift: false,
		options: false,
		currentLayout: this.j.o.keyboard.defaultLayoutSet
	};

	/** @override */
	protected override render(): string {
		const { layout, keySize } = this.j.options.keyboard,
			rowCount: number = layout.length;

		return `<div>${((): string => {
			const rows: string[] = [];

			for (let i = 0; i < rowCount; i += 1) {
				const row: string[] = [];

				for (let j = 0; j < layout[i].length; j += 1) {
					row.push(
						`<div style="width:${
							keySize * layout[i][j]
						}px;height:${keySize}px;" class="&__key"></div>`
					);
				}

				rows.push(`<div class='&__row'>${row.join('\n')}</div>`);
			}

			return rows.join('\n');
		})()}</div>`;
	}

	@watch([
		'state.currentLayout',
		'state.options',
		'state.shift',
		'state.caps'
	])
	private onStateChange(): void {
		const { currentLayout, options, shift, caps } = this.state,
			{ keys } = this.j.o.keyboard.layoutList[currentLayout];

		let index = 0;

		for (let i = 0; i < keys.length; i += 1) {
			for (let j = 0; j < keys[i].length; j += 1) {
				const values = keys[i][j].split(' ');
				let value = values[0];

				if (shift) {
					value = values[1];
				}

				if (
					!shift &&
					caps &&
					values[1] &&
					UIKeyboard.isLetter(values[0])
				) {
					value = values[1];
				}

				if (options) {
					value = values[2];
				}

				this.setKeyValue(index, value ?? values[0]);
				index += 1;
			}
		}
	}

	private static isLetter(c: string): boolean {
		return c.toLowerCase() !== c.toUpperCase();
	}

	private _keys = this.getElms('key');

	private setKeyValue(index: number, value: string): void {
		const elm = this._keys[index];
		if (!elm) {
			return;
		}

		let active = false;
		const { options, shift, caps } = this.state;

		switch (value) {
			case 'Caps':
				active = caps;
				break;

			case 'Options':
				active = options;
				break;

			case 'Shift':
				active = shift;
				break;
		}

		elm.innerHTML = UIKeyboard.decorate(value);
		elm.classList.toggle(this.getFullElName('key', 'active', true), active);

		attr(elm, '-key', value);
	}

	private pressed: boolean = false;

	@watch(['ow:mouseup'])
	protected onKeyUp(): void {
		if (this.pressed) {
			this.stopPress();
		}
	}

	@hook('ready')
	protected onReady(): void {
		this.j.e.on(this.getElms('key'), 'mouseenter', this.stopPress);
	}

	@autobind
	private stopPress(): void {
		if (this.pressed) {
			this.pressed = false;
			this.j.async.clearTimeout(this.reKeyDownTimeout);
			this._keys.forEach((elm) => {
				elm.classList.remove(
					this.getFullElName('key', 'pressed', true)
				);
			});
		}
	}

	private reKeyDownTimeout: number = 0;

	@watch(['container:mousedown'], ['container:touchstart'])
	protected onKeyDown(e: MouseEvent, timeout: number = 0): false {
		const target = e.target as HTMLElement;

		if (!target || !target.classList.contains(this.getFullElName('key'))) {
			return false;
		}

		this.pressed = true;
		target.classList.add(this.getFullElName('key', 'pressed', true));

		const key = attr(target, '-key');

		switch (key) {
			case 'Caps':
				this.state.caps = !this.state.caps;
				break;

			case 'Shift':
				this.state.shift = !this.state.shift;
				break;

			case 'Options':
				this.state.options = !this.state.options;
				break;

			case 'Enter':
			case 'Backspace':
				this.j.e.fire('keydown', {
					key,
					preventDefault() {}
				});
				break;

			case 'Space':
			case 'Tab':
				this.j.s.insertNode(this.j.createInside.text(NBSP_SPACE));
				break;

			default:
				if (this.state.shift) {
					this.state.shift = false;
				}

				key && this.j.s.insertNode(this.j.createInside.text(key));
		}

		const { periodKeyRepeat, delayKeyRepeat } = this.j.o.keyboard;
		this.reKeyDownTimeout = this.j.async.setTimeout(
			() => this.onKeyDown(e, periodKeyRepeat),
			timeout || delayKeyRepeat
		);

		return false;
	}

	constructor(jodit: UIKeyboard['jodit']) {
		super(jodit);
		this.onStateChange();
	}

	private static decorate(value: string): string {
		switch (value) {
			case 'Space':
				return '';

			case 'Enter':
				return Icon.get('enter');

			case 'Backspace':
				return require('../assets/backspace.svg');

			case 'Shift':
				return require('../assets/shift.svg');

			case 'Caps':
				return require('../assets/caps.svg');

			case 'Options':
				return require('../assets/dots.svg');

			case 'Tab':
				return require('../assets/tab.svg');

			default:
				return value;
		}
	}
}
