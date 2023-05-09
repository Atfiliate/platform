/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { ISnapshotItem } from '../interface';
import type { IDictionary, IJodit } from 'jodit/types';
import { UIGroup } from 'jodit/core/ui';
import { autobind, component, watch } from 'jodit/core/decorators';
import { UIBackupItem } from './item';
import { KEY_DOWN, KEY_ENTER, KEY_UP } from 'jodit/core/constants';
import { attr } from 'jodit/core/helpers';

@component
export class UIBackupList extends UIGroup<IJodit> {
	/** @override */
	override className(): string {
		return 'UIBackupList';
	}

	override elements: UIBackupItem[] = [];

	/** @override */
	protected override createContainer(options?: IDictionary): HTMLElement {
		const div = super.createContainer(options);
		attr(div, 'tabIndex', '-1');
		return div;
	}

	constructor(jodit: IJodit) {
		super(jodit);

		jodit.e.on(this.container, 'keydown', (e: KeyboardEvent) => {
			switch (e.key) {
				case KEY_ENTER:
					e.preventDefault();
					e.stopPropagation();
					this.onChoose(this.currentSelection);
					break;

				case KEY_DOWN:
					this.selectNext();
					break;

				case KEY_UP:
					this.selectPrevious();
					break;
			}
		});
	}

	build(items: ISnapshotItem[]): void {
		this.clear();

		items.forEach((data, index) => {
			const item = new UIBackupItem(this.jodit, data);

			this.append(item);

			this.j.e
				.on(item.container, 'focus', () => this.onSelect(index))
				.on(item.container, 'click', () => this.onSelect(index))
				.on(item.container, 'dblclick', () => this.onChoose(index));
		});

		this.currentSelection = 0;
		this.onChangeCurrentSelection(void 0, -1, 0);
	}

	private currentSelection: number = -1;

	@watch('currentSelection')
	onChangeCurrentSelection(_: unknown, old: number, index: number): void {
		this.elements[old]?.setMod('active', false);
		this.elements[index]?.setMod('active', true);
		this.elements[index]?.focus();
		this.j.e.fire(this, 'select', this.elements[index].data);
	}

	@autobind
	private onSelect(index: number): void {
		this.currentSelection = index;
	}

	@autobind
	private onChoose(index?: number): void {
		this.j.e.fire(
			this,
			'choose',
			this.elements[index ?? this.currentSelection].data
		);
	}

	selectNext(): void {
		if (this.currentSelection + 1 <= this.elements.length - 1) {
			this.currentSelection += 1;
		} else {
			this.currentSelection = 0;
		}
	}

	selectPrevious(): void {
		if (this.currentSelection - 1 >= 0) {
			this.currentSelection -= 1;
		} else {
			this.currentSelection = this.elements.length - 1;
		}
	}
}
