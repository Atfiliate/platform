/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './virtual-scroll.less';

import type { IFileBrowserItemElement } from 'jodit/types/file-browser';
import type { StateManager } from '../../helpers/state-manager';
import type { IFileBrowserPro } from '../../interface';
import type { IBound } from 'jodit/types';
import type { IFileBrowserItem } from 'jodit/types/file-browser';
import { UIGroup } from 'jodit/core/ui';
import { component, watch, throttle } from 'jodit/core/decorators';
import { UIBrowserItem } from '../item/item';
import { FileBrowserItem } from 'jodit/modules/file-browser/builders/item';
import { UISelectItems } from '../../../../traits/select-items/select-items';
import { position } from 'jodit/core/helpers';

@component
export class UIVirtualScroll
	extends UIGroup<IFileBrowserPro>
	implements UISelectItems
{
	override elements!: UIBrowserItem[];

	/** @override */
	override syncMod: boolean = true;

	/** @override */
	override className(): string {
		return 'UIVirtualScroll';
	}

	/** @override */
	protected override render(): string {
		return `<div>
				<div class="&__empty-message">~There are no files~</div>
				<div class='&__loader'></div>
				<div class='&__drag-area'>~Drop image~</div>
			</div>`;
	}

	constructor(
		jodit: UIVirtualScroll['jodit'],
		readonly stateManager: StateManager
	) {
		super(jodit);
		this.addItemsSelector();
	}

	private reconcile(items: IFileBrowserItemElement[]): number {
		const clearIndex = this.elements.findIndex((elm, index) => {
			return (
				!items[index] ||
				elm.item.uniqueHashKey !==
					FileBrowserItem.create(items[index]).uniqueHashKey
			);
		});

		if (clearIndex > -1) {
			for (let i = clearIndex; i < this.elements.length; i += 1) {
				this.elements[i].destruct();
			}
			this.elements.length = clearIndex;
		}

		return clearIndex;
	}

	build(items: IFileBrowserItemElement[]): void {
		const clearIndex = this.reconcile(items);

		items
			.slice(clearIndex > -1 ? clearIndex : this.elements.length)
			.forEach((item) => {
				const elm = new UIBrowserItem(this.jodit, item);

				Object.keys(this.mods).forEach((mod) => {
					elm.setMod(mod, this.mods[mod]);
				});

				this.append(elm);
			});

		this.setMod('empty', !this.elements.length);
	}

	@watch(':afterResize')
	@watch(':resize')
	@watch('container:scroll')
	@throttle()
	protected onScrollLoadChunk(): void {
		if (
			!this.stateManager.isFavoriteItems &&
			this.container.scrollHeight -
				(this.container.scrollTop + this.container.offsetHeight) <
				this.j.o.pixelOffsetLoadNewChunk
		) {
			void this.j.loadingManager.loadItemsChunk();
		}
	}

	@watch('container:dragover')
	protected onDragOver(e: DragEvent): void {
		e.preventDefault();
		this.setMod('dragover', true);
	}

	@watch(['container:dragleave', 'container:drop'])
	protected onDragLeave(e: DragEvent): void {
		e.preventDefault();
		this.setMod('dragover', false);
	}

	addItemsSelector(): void {
		UISelectItems.install(this);
	}

	private static intersectRect(r1: IBound, r2: IBound): boolean {
		return !(
			r2.left > r1.left + r1.width ||
			r2.left + r2.width < r1.left ||
			r2.top > r1.top + r1.height ||
			r2.top + r2.height < r1.top
		);
	}

	onSelectItems(bound: IBound): void {
		const selected: IFileBrowserItem[] = [];
		this.elements.forEach((elm) => {
			const pos = position(elm.container);

			if (UIVirtualScroll.intersectRect(pos, bound)) {
				selected.push(elm.item);
			}
		});

		this.stateManager.state.activeElements = selected;
	}
}
