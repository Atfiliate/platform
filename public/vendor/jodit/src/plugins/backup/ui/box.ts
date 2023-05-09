/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './box.less';

import type { IJodit } from 'jodit/types';
import type { ISnapshotItem } from '../interface';
import { autobind, component } from 'jodit/core/decorators';
import { UIElement } from 'jodit/core/ui';
import { UIBackupList } from './list';

@component
export class UIBackupBox extends UIElement<IJodit> {
	/** @override */
	override className(): string {
		return 'UIBackupBox';
	}

	private list = new UIBackupList(this.j);
	private preview = this.j.c.div(this.getFullElName('preview'));

	private latestSelected!: ISnapshotItem;

	constructor(jodit: IJodit) {
		super(jodit);
		this.container.appendChild(this.list.container);
		this.container.appendChild(this.preview);

		this.list.container.classList.add(this.getFullElName('list'));

		jodit.e
			.on(this.list, 'select', this.onSelectItem)
			.on(this.list, 'choose', this.onChooseItem);
	}

	build(items: ISnapshotItem[]): void {
		this.preview.innerHTML = '';
		this.list.build(items);
	}

	/** @override */
	override destruct(): void {
		this.j.e.off(this.list, 'select', this.onSelectItem);
		this.list.destruct();
		return super.destruct();
	}

	/**
	 * On select item inside list
	 */
	@autobind
	private onSelectItem(item: ISnapshotItem): void {
		this.latestSelected = item;
		this.preview.innerHTML =
			item.html ||
			`<div class="${this.getFullElName('empty')}">${this.j.i18n(
				'Empty'
			)}</div>`;
	}

	/**
	 * On choose item inside list
	 */
	@autobind
	private onChooseItem(item: ISnapshotItem): void {
		this.j.e.fire(this, 'choose', item);
	}

	chooseSelected(): void {
		this.onChooseItem(this.latestSelected);
	}
}
