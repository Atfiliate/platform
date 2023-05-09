/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './config';

import type { IDialog, IJodit, Nullable } from 'jodit/types';
import type { ISnapshotItem, ISnapshotStorage } from './interface';
import { Plugin } from 'jodit/core/plugin';
import { DefaultStorage } from './modules/store';
import { UIBackupBox } from './ui/box';
import { Button, UIBlock } from 'jodit/core/ui';
import { autobind } from 'jodit/core/decorators';
import { Jodit } from '../../index';

export class backup extends Plugin {
	/** @override */
	override requires = ['license'];

	/** @override */
	override hasStyle = !Jodit.fatMode;

	/** @override */
	override buttons: Plugin['buttons'] = [
		{
			name: 'backup.restore',
			group: 'history'
		}
	];

	private __box = new UIBackupBox(this.j);

	private __dialog: Nullable<IDialog> = null;

	private __storage: ISnapshotStorage =
		this.jodit.o.backup.remoteStore ?? new DefaultStorage(this.jodit);

	private timeout: number = 0;

	/** @override */
	protected afterInit(jodit: IJodit): void {
		jodit
			.registerCommand('saveBackup', this.onSaveBackup)
			.registerCommand('openBackupDialog', {
				exec: this.onOpenBackupDialog,
				hotkeys: jodit.o.backup.hotkeys
			});

		const startInterval = (): void => {
			this.timeout = jodit.async.setTimeout(() => {
				this.onSaveBackup();
				startInterval();
			}, jodit.o.backup.interval * 1000);
		};

		startInterval();

		jodit.e
			.on(this.__box, 'choose', this.onSelectItem)
			.on(jodit.ow, 'beforeunload.backup', () => {
				this.onSaveBackup();
			});
	}

	private prepareDialog(): void {
		if (!this.__dialog) {
			this.__dialog = this.j
				.dlg({
					minWidth: this.j.o.backup.dialogWidth,
					buttons: ['fullsize', 'dialog.close']
				})
				.setContent(this.__box.container);
		}

		this.__dialog.setHeader(this.jodit.i18n('Restore'));
		this.addButtonsToDialog();
	}

	@autobind
	private onSaveBackup(): void {
		this.__storage.add({
			created: new Date(),
			html: this.j.value
		});
	}

	@autobind
	private async onOpenBackupDialog(): Promise<void> {
		this.prepareDialog();
		const { __dialog } = this;

		if (!__dialog) {
			return;
		}

		__dialog.open().setModal(true);
		const items = await this.__storage.items();

		this.__box.build([
			{
				created: new Date(),
				html: this.j.value
			},
			...items
		]);

		__dialog.calcAutoSize();
		__dialog.setPosition();
	}

	@autobind
	private onSelectItem(data: ISnapshotItem): void {
		this.__dialog?.close();
		this.j.value = data.html;
		this.j.s.focus();
	}

	private addButtonsToDialog(): void {
		const { jodit } = this;
		const ok = Button(jodit, {
				name: 'ok',
				tabIndex: 0,
				variant: 'primary',
				text: 'Ok'
			}),
			cancel = Button(jodit, {
				variant: 'secondary',
				tabIndex: 0,
				text: 'Cancel'
			}),
			clear = Button(jodit, {
				name: 'clear',
				tabIndex: 0,
				variant: 'secondary',
				text: 'Remove all'
			});

		ok.onAction(() => {
			this.__box.chooseSelected();
		});

		cancel.onAction(() => {
			this.__dialog?.close();
		});

		clear.onAction(() => {
			jodit.confirm('Are you sure?', undefined, (confirm) => {
				if (confirm) {
					this.__storage.clear();
					this.__dialog?.close();
				}
			});
		});

		const block = new UIBlock(jodit, [clear, cancel, ok]);

		block.container.style.margin = '0';
		block.container.style.justifyContent = 'flex-end';
		block.container.style.width = '100%';

		this.__dialog?.setFooter(block);
	}

	/** @override */
	protected beforeDestruct(): void {
		const { j } = this;
		j.async.clearTimeout(this.timeout);

		j.e
			.off(this.__box, 'choose', this.onSelectItem)
			.off(j.ow, 'beforeunload.backup');

		this.__box.destruct();
		this.__dialog?.destruct();
	}
}

Jodit.plugins.add('backup', backup);
