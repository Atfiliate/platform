/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IJodit } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Dialog } from 'jodit/modules';
import { UIIframeEditor } from './ui/iframe-editor/iframe-editor';
import { autobind, watch } from 'jodit/core/decorators';
import { Dom } from 'jodit/core/dom';
import { Jodit } from '../../index';
import { Button } from 'jodit/core/ui/button';
import { attr, css } from 'jodit/core/helpers';

import './config';

export class IframeEditor extends Plugin {
	/** @override */
	override requires: string[] = ['license', 'color-picker'];

	/** @override */
	override buttons: Plugin['buttons'] = [
		{
			group: 'form',
			name: 'iframeEditor'
		}
	];

	protected afterInit(jodit: IJodit): void {
		jodit.e.on('toggleIframeEditor', this.toggleEditor);
		// 	.on('isButtonGeneratorOpened', () => this.__dialog?.isOpened);
	}

	private __dialog!: Dialog;

	@autobind
	private toggleEditor(target?: HTMLElement): void {
		if (!this.__dialog) {
			this.__dialog = new Dialog({
				language: this.j.o.language,
				theme: this.j.o.theme
			});

			this.__dialog.setHeader('Iframe Properties').setSize(470, 400);
		}

		if (target && !Dom.isTag(target, ['iframe'])) {
			target = undefined;
		}

		const ui = new UIIframeEditor(this.__dialog, {
			src: target?.src ?? '',
			name: target?.name ?? '',
			title: target?.title ?? '',
			frameBorder:
				target?.frameBorder === '1' || target?.frameBorder === 'yes',
			width: target?.offsetWidth ?? 700,
			height: target?.offsetHeight ?? 400
		});

		this.__dialog.setContent(ui);

		const dlg = this.__dialog;

		if (dlg.isOpened) {
			dlg.close();
		} else {
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
					if (!ui.srcField.value) {
						ui.srcField.validate();
						ui.srcField.focus();
						return;
					}

					if (!target) {
						target = this.j.createInside.element('iframe');
						this.j.s.insertNode(target, true, false);
					}

					target.className = ui.state.className || '';

					attr(target, {
						src: ui.state.src,
						title: ui.state.title,
						name: ui.state.name,
						frameborder: ui.state.frameBorder ? '1' : '0',
						width: ui.state.width,
						height: ui.state.height
					});

					if (Dom.isTag(target.parentElement, 'jodit')) {
						css(target.parentElement, {
							width: ui.state.width,
							height: ui.state.height
						});
					}

					this.jodit.e.fire('synchro');

					dlg.close();
				})
			]).open();

			this.jodit.async.requestIdleCallback(() => {
				ui.srcField.focus();
			});
		}
	}

	/**
	 * DBLClick handler
	 */
	@watch(':dblclick')
	protected onDblClick(e: MouseEvent): void {
		if (Dom.isTag(e.target, 'iframe')) {
			this.toggleEditor(e.target);
		}
	}

	protected beforeDestruct(jodit: IJodit): void {
		this.__dialog?.destruct();
	}
}

Jodit.plugins.add('iframe-editor', IframeEditor);
