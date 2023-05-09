/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './autocomplete.less';

import type { IAutoCompleteItem } from '../interface';
import { component, watch } from 'jodit/core/decorators';
import { UIGroup } from 'jodit/core/ui';
import { AutocompleteItem } from './item';

@component
export class Autocomplete extends UIGroup {
	/** @override */
	override className(): string {
		return 'Autocomplete';
	}

	override elements: AutocompleteItem[] = [];

	private currentSelection: number = -1;

	@watch('currentSelection')
	private onChangeSelection(_?: unknown, previous?: number): void {
		previous != null && this.elements[previous]?.setMod('active', false);
		this.elements[this.currentSelection].setMod('active', true);
		this.elements[this.currentSelection].container.scrollIntoView(false);
	}

	build(list: IAutoCompleteItem[]): void {
		this.clear();

		list.forEach((elm, index) => {
			const item = new AutocompleteItem(this.jodit, elm);

			this.j.e
				.on(item.container, 'mousedown touchstart', (e: MouseEvent) => {
					e.preventDefault();
				})
				.on(item.container, 'click', () => {
					this.currentSelection = index;
					this.select();
				});

			this.append(item);
		});

		this.currentSelection = 0;
		this.onChangeSelection();
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

	select(): void {
		this.j.e.fire(
			'select.autocomplete',
			this.elements[this.currentSelection].item
		);
	}
}
