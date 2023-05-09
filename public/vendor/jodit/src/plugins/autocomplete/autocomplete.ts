/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IBound, IJodit, IPopup } from 'jodit/types';
import type {
	AutoCompleteSource,
	IAutoCompleteItem,
	IAutoCompleteCustomFeed
} from './interface';

import { Plugin } from 'jodit/core/plugin';
import { Config } from 'jodit/config';
import { autobind, debounce } from 'jodit/core/decorators';
import {
	isArray,
	isFunction,
	isString,
	isPromise,
	trim,
	position
} from 'jodit/core/helpers';
import { Dom } from 'jodit/core/dom/dom';
import { Popup } from 'jodit/core/ui/popup/popup';
import { Autocomplete } from './ui/autocomplete';
import {
	KEY_DOWN,
	KEY_ENTER,
	KEY_ESC,
	KEY_TAB,
	KEY_UP
} from 'jodit/core/constants';
import { Jodit } from '../../index';
import {
	getTextLeftOfCursor,
	replaceTextLeftOfCursorAfterSpace
} from './helpers';

declare module 'jodit/config' {
	interface Config {
		autocomplete: {
			maxItems: number;
			isMatchedQuery: (query: string, value: string) => boolean;
			itemRenderer: (item: IAutoCompleteItem) => string | HTMLElement;
			insertValueRenderer: (
				item: IAutoCompleteItem
			) => string | HTMLElement;
			sources: AutoCompleteSource[];
		};
	}
}

Config.prototype.autocomplete = {
	sources: [],
	maxItems: 50,
	isMatchedQuery: (query, value): boolean =>
		value.toLowerCase().indexOf(query.toLowerCase()) === 0,
	itemRenderer: (item): string => item.title ?? item.value,
	insertValueRenderer: (item): string => item.value + '&nbsp;'
};

export class autocomplete extends Plugin {
	/** @override */
	override requires = ['enter', 'license'];

	/** @override */
	override hasStyle = !Jodit.fatMode;

	private list!: Autocomplete;
	private popup!: IPopup;
	private sources: AutoCompleteSource[] = [];

	/** @override */
	protected afterInit(jodit: IJodit): void {
		this.popup = new Popup(jodit);
		this.popup.setMod('padding', false);
		this.list = new Autocomplete(jodit);
		this.popup.setContent(this.list.container);

		jodit.e
			.on('select.autocomplete', (item: IAutoCompleteItem) => {
				let insertValue: string | HTMLElement = item.value;

				if (isFunction(item.insertValueRenderer)) {
					insertValue = item.insertValueRenderer(item);
				}

				if (!Dom.isNode(insertValue)) {
					insertValue = jodit.createInside.fromHTML(insertValue);
				}

				replaceTextLeftOfCursorAfterSpace(jodit.s.range, insertValue);
				this.j.s.setCursorAfter(insertValue);
				this.j.synchronizeValues();

				this.popup.close();
			})
			.on('keydown.autocomplete', this.onKeyDown)
			.on('keydown.autocomplete', this.onKeyControlDown, {
				top: true
			})
			.on('beforeEnter.autocomplete', this.onEnter, { top: true })
			.on('autocomplete.autocomplete', this.onAutoComplete)
			.on(
				'registerAutocompleteSource.autocomplete',
				this.registerAutocompleteSource
			);
	}

	@autobind
	private registerAutocompleteSource(source: AutoCompleteSource): void {
		this.sources.push(source);
	}

	private static isControlKey(key: string): boolean {
		return (
			key === KEY_DOWN ||
			key === KEY_UP ||
			key === KEY_ENTER ||
			key === KEY_TAB
		);
	}

	@debounce()
	private async onKeyDown(e: KeyboardEvent): Promise<void> {
		if (e.key === KEY_ESC) {
			this.popup.isOpened && this.popup.close();
			return;
		}

		const { s } = this.j;

		if (
			autocomplete.isControlKey(e.key) ||
			!s.isInsideArea ||
			!s.isCollapsed
		) {
			return;
		}

		const range = this.j.s.sel?.rangeCount
			? this.j.s.sel?.getRangeAt(0)
			: null;

		const query = range && getTextLeftOfCursor(range).split(' ').pop();

		if (query && trim(query).length) {
			const result = await this.onAutoComplete(query);

			if (result.length) {
				return this.openPopup(result);
			}
		}

		if (this.popup.isOpened) {
			this.popup.close();
		}
	}

	@autobind
	private onKeyControlDown(e: KeyboardEvent): false | void {
		if (this.popup.isOpened && autocomplete.isControlKey(e.key)) {
			switch (e.key) {
				case KEY_DOWN:
					this.list.selectNext();
					break;

				case KEY_UP:
					this.list.selectPrevious();
					break;

				case KEY_TAB:
					this.list.select();
					break;
			}

			this.j.e.stopPropagation(e.type);
			return false;
		}
	}

	@autobind
	private onEnter(): false | void {
		if (this.popup.isOpened) {
			this.list.select();
			return false;
		}
	}

	@autobind
	private async onAutoComplete(query: string): Promise<IAutoCompleteItem[]> {
		const result: IAutoCompleteItem[] = [];

		await Promise.all(
			this.sources
				.concat(this.j.o.autocomplete.sources)
				.map(async (source) => {
					result.push(...(await this.resolveFeed(query, source)));
				})
		);

		return result;
	}

	@autobind
	async resolveFeed<T extends IAutoCompleteItem = IAutoCompleteItem>(
		query: string,
		feed: AutoCompleteSource<T> | IAutoCompleteCustomFeed<T>['feed'],
		baseSource?: IAutoCompleteCustomFeed<T>
	): Promise<T[]> {
		let parts: T[];

		if (isPromise(feed)) {
			feed = await feed;
		}

		if (isFunction(feed)) {
			parts = await feed(query);
		} else if (isArray(feed)) {
			const arrayFeed = feed as Array<string | T>,
				{ isMatchedQuery } = this.j.o.autocomplete;

			parts = arrayFeed
				.filter((item) => {
					if (isString(item)) {
						return isMatchedQuery(query, item);
					}

					return isMatchedQuery(query, item.value);
				})
				.map((item) => {
					if (isString(item)) {
						return { title: item, value: item } as T;
					}

					return item;
				});
		} else {
			parts = await this.resolveFeed(query, feed.feed, feed);
		}

		if (parts && isArray(parts)) {
			const { itemRenderer, insertValueRenderer, maxItems } =
				this.j.o.autocomplete;

			parts = parts.map((item) => ({
				itemRenderer: baseSource?.itemRenderer ?? itemRenderer,
				insertValueRenderer:
					baseSource?.insertValueRenderer ?? insertValueRenderer,
				...item
			}));

			return parts.slice(0, maxItems);
		}

		return [];
	}

	private openPopup(result: IAutoCompleteItem[]): void {
		this.list.build(result);
		this.popup.open(() => {
			const { j } = this;
			const rect = j.s.range.getBoundingClientRect();

			const bound: IBound = {
				left: rect.left,
				top: rect.top,
				height: rect.height,
				width: rect.width
			};

			if (j.o.iframe && j.iframe) {
				const pos = position(j.iframe, j);
				bound.top += pos.top;
				bound.left += pos.left;
			}

			return bound;
		});
	}

	/** @override */
	protected beforeDestruct(jodit: IJodit): void {
		jodit.e
			.off(this.list)
			.off('keydown.autocomplete', this.onKeyDown)
			.off('autocomplete.autocomplete', this.onAutoComplete)
			.off('.autocomplete');

		this.list.destruct();
		this.popup.destruct();
	}
}

Jodit.plugins.add('autocomplete', autocomplete);
