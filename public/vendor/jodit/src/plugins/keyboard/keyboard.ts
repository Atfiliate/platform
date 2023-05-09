/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import type { IControlType, IDictionary, IJodit } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Jodit } from '../../index';
import { UIKeyboard } from './ui/keyboard/keyboard';
import { autobind } from 'jodit/core/decorators';

import './config';
import { Dialog } from 'jodit/modules';
import { UISelect } from 'jodit/core/ui';
import { isString } from 'jodit/core/helpers/checker';
import { Config } from 'jodit/config';

export class keyboard extends Plugin {
	/** @override */
	override hasStyle: boolean = !Jodit.fatMode;

	/** @override */
	override requires: string[] = ['license'];

	/** @override */
	override buttons: Plugin['buttons'] = [
		{
			group: 'insert',
			name: 'keyboard'
		}
	];

	constructor(jodit: IJodit) {
		super(jodit);

		const { extraKeyButtons, extraKeyGroup } = jodit.o.keyboard;

		if (extraKeyButtons.length) {
			extraKeyButtons.forEach((key, index) => {
				const id = isString(key) ? key : key.key,
					hotkeys =
						isString(key) || !key.hotkeys
							? [`ctrl+${index + 1}`]
							: key.hotkeys;

				jodit.registerButton({
					name: `extraKeyboardButtons.${id}`,
					group: extraKeyGroup
				});

				const { extraKeyboardButtons } = Config.defaultOptions
					.controls as IDictionary;

				extraKeyboardButtons[id] = {
					name: id,
					tooltip: id,
					args: [id],
					hotkeys,
					command: 'insertChar'
				} as IControlType;
			});
		}
	}

	/** @override */
	protected afterInit(jodit: IJodit): void {
		jodit
			.registerCommand('toggleKeyboard', this.toggleKeyboard)
			.registerCommand('insertChar', this.insertChar);

		jodit.e.on('isKeyboardOpened', () => this.__keyboard?.isOpened);
	}

	@autobind
	insertChar(_: unknown, _1: unknown, insertChar: string): void {
		this.j.s.insertNode(this.j.createInside.text(insertChar));
	}

	private __keyboard!: Dialog;

	/**
	 * Show or hide virtual Keyboard
	 */
	@autobind
	private toggleKeyboard(): void {
		if (!this.__keyboard) {
			this.__keyboard = new Dialog({
				toolbarButtonSize: 'tiny'
			});

			const ui = new UIKeyboard(this.j);

			this.__keyboard
				.setMod('slim', true)
				.setMod('adaptive', false)
				.setContent(ui);

			const { showLayoutSwitcher, layoutSwitchList, layoutList } =
				this.j.o.keyboard;

			if (showLayoutSwitcher) {
				const switcher = new UISelect(this.__keyboard, {
					value: ui.state.currentLayout,
					options: layoutSwitchList.map((key) => {
						const title = layoutList[key]?.title ?? key;

						return {
							text: title,
							value: key
						};
					}),
					onChange(value): void {
						ui.state.currentLayout = value;
					}
				});

				switcher
					.setMod('size', 'tiny')
					.setMod('width', 'auto')
					.setMod('variant', 'outline');

				this.__keyboard.setHeader(switcher);
			}
		}

		if (this.__keyboard.isOpened) {
			this.__keyboard.close();
		} else {
			this.__keyboard.open();
		}
	}

	/** @override */
	protected beforeDestruct(jodit: IJodit): void {
		this.__keyboard?.destruct();
	}
}

Jodit.plugins.add('keyboard', keyboard);
