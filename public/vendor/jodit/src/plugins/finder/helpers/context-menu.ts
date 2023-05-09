/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IFileBrowserPro, IFileBrowserTreeItemPro } from '../interface';
import type { IFileBrowserItemWrapper, IContextMenuAction } from 'jodit/types';
import { makeContextMenu } from 'jodit/modules/file-browser/factories';
import { ViewComponent } from 'jodit/core/component';
import { component, watch } from 'jodit/core/decorators';

@component
export class ContextMenuManager extends ViewComponent<IFileBrowserPro> {
	/** @override */
	className(): string {
		return 'ContextMenuManager';
	}

	@watch(':contextmenuFolder.filebrowser')
	protected onFolderContext(
		item: IFileBrowserTreeItemPro,
		e: MouseEvent
	): void | false {
		this.buildContextItemMenu(this.getFolderContextActions(item), e);
		return false;
	}

	@watch(':contextmenuItem.filebrowser')
	protected onItemContext(
		item: IFileBrowserItemWrapper,
		_: unknown,
		e: MouseEvent
	): void | false {
		this.buildContextItemMenu(this.getItemContextActions(item), e);
		return false;
	}

	@watch(':contextmenuSource.filebrowser')
	protected onSourceContext(
		item: IFileBrowserTreeItemPro,
		e: MouseEvent
	): void | false {
		this.buildContextItemMenu(this.getSourceContextActions(item), e);
		return false;
	}

	private buildContextItemMenu(
		actions: Array<false | IContextMenuAction>,
		e: MouseEvent
	): void {
		if (!this.j.o.contextMenu) {
			return;
		}

		const context = makeContextMenu(this.j).setMod(
			'theme',
			this.j.state.theme
		);

		context.show(
			e.clientX,
			e.clientY,
			actions.filter((a) => a && a.enabled !== false)
		);

		this.j.e.on(this.j, 'afterClose', () => {
			if (context.isOpened) {
				context.close();
			}
		});
	}

	private getItemContextActions(
		item: IFileBrowserItemWrapper
	): IContextMenuAction[] {
		if (!this.j.stateManager.isActive(item)) {
			this.j.stateManager.addActive(
				item,
				this.j.state.activeElements.length > 1
			);
		}

		if (item.type === 'folder') {
			return this.getFolderContextActions({
				type: 'directory',
				children: [],
				name: item.name || '',
				path: item.path,
				sourceName: item.sourceName
			});
		}

		const opt = this.j.options,
			dp = this.j.dataProvider,
			single = this.j.state.activeElements.length === 1;

		return [
			{
				icon: 'pencil',
				title: 'Edit',
				enabled:
					Boolean(item.isImage) &&
					opt.editImage &&
					single &&
					(dp.canI('ImageResize') || dp.canI('ImageCrop')),
				exec: (): void => {
					this.j.e.fire('edit.filebrowser');
				}
			},
			{
				icon: 'italic',
				title: 'Rename',
				enabled: dp.canI('FileRename') && single,
				exec: () => this.j.e.fire('fileRename.filebrowser', item)
			},
			{
				icon: 'bin',
				title: 'Delete',
				enabled: dp.canI('FileRemove'),
				exec: () => this.j.e.fire('fileRemove.filebrowser', item)
			},
			{
				icon: 'eye',
				title: 'Preview',
				enabled:
					Boolean(item.isImage || item.type === 'file') &&
					opt.preview &&
					single,
				exec: () => this.j.e.fire('openLightBox.filebrowser', item)
			},
			{
				icon: 'upload',
				title: 'Download',
				exec: (): void => {
					// TODO Replace to download action
					if (item.fileURL) {
						this.j.ow.open(item.fileURL);
					}
				}
			}
		];
	}

	private getFolderContextActions(
		item: IFileBrowserTreeItemPro
	): IContextMenuAction[] {
		const dp = this.j.dataProvider;

		return [
			{
				icon: 'pencil',
				title: 'Rename',
				exec: (): void => {
					this.j.e.fire('folderRename.filebrowser', item);
				},
				enabled: dp.canI('FolderRename')
			},
			{
				icon: 'bin',
				title: 'Delete',
				exec: (): void => {
					this.j.e.fire('folderRemove.filebrowser', item);
				},
				enabled: dp.canI('FolderRemove')
			},
			{
				icon: 'plus',
				title: 'Add folder',
				exec: (): void => {
					this.j.e.fire('folderCreate.filebrowser', item);
				},
				enabled: dp.canI('FolderCreate')
			}
		];
	}

	private getSourceContextActions(
		item: IFileBrowserTreeItemPro
	): Array<false | IContextMenuAction> {
		return [
			{
				icon: 'plus',
				title: 'Create folder',
				exec: (): void => {
					this.j.e.fire('folderCreate.filebrowser', item);
				}
			}
		];
	}
}
