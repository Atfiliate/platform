/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import type { CanUndef, IJodit } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Jodit } from '../../index';
import { autobind, watch } from 'jodit/core/decorators';
import { Dialog } from 'jodit/modules/dialog/dialog';
import { Dom } from 'jodit/core/dom/dom';
import { Button } from 'jodit/core/ui/button';

import { UIButtonGenerator } from './ui/generator/button-generator';
import './config';
import { UIGButton } from './ui/button/button';

export class buttonGenerator extends Plugin {
	/** @override */
	override hasStyle: boolean = !Jodit.fatMode;

	/** @override */
	override requires: string[] = ['license', 'color-picker'];

	/** @override */
	override buttons: Plugin['buttons'] = [
		{
			group: 'form',
			name: 'buttonGenerator'
		}
	];

	protected afterInit(jodit: IJodit): void {
		jodit.e
			.on('toggleButtonGenerator', this.toggleButtonGenerator)
			.on('isButtonGeneratorOpened', () => this.__dialog?.isOpened);
	}

	private __dialog!: Dialog;
	private __ui!: UIButtonGenerator;

	@autobind
	toggleButtonGenerator(target: CanUndef<HTMLElement>): void {
		if (!this.__dialog) {
			this.__dialog = new Dialog({
				language: this.j.o.language,
				theme: this.j.o.theme
			});

			this.__ui = new UIButtonGenerator(this.__dialog);

			this.__dialog
				.setHeader('Button Generator')
				.setContent(this.__ui)
				.setSize(730, 700);
		}

		if (target && !Dom.isTag(target, ['button', 'a'])) {
			target = undefined;
		}

		const ui = this.__ui;
		const dlg = this.__dialog;

		if (dlg.isOpened) {
			dlg.close();
		} else {
			target && UIGButton.extractStyle(ui.state, target);
			ui.target = target;
			ui.update();

			dlg.setFooter([
				Button(dlg, 'cancel', 'Cancel', 'default').onAction(() =>
					dlg.close()
				),
				Button(
					dlg,
					'ok',
					target ? 'Update' : 'Insert',
					'primary'
				).onAction(() => {
					if (!target) {
						target = this.j.createInside.element(
							ui.state.href ? 'a' : 'button'
						);
						this.j.s.insertNode(target, true, false);
					}

					UIGButton.applyStyle(ui.state, target);
					target.className = ui.state.className || '';

					this.jodit.e.fire('synchro');
					dlg.close();
				})
			]).open();
		}
	}

	/**
	 * DBLClick handler
	 */
	@watch(':dblclick')
	protected onDblClick(e: MouseEvent): void {
		if (Dom.isTag(e.target, 'button')) {
			this.toggleButtonGenerator(e.target);
		}
	}

	protected beforeDestruct(jodit: IJodit): void {
		this.__dialog?.destruct();
	}
}

Jodit.plugins.add('button-generator', buttonGenerator);
