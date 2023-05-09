/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './emoji.less';

import type { IEmoji, IEmojiData, IEmojiList, IShortEmoji } from '../interface';
import type { IDictionary, IJodit } from 'jodit/types';
import { UIElement, UIInput } from 'jodit/core/ui';
import { attr, isString } from 'jodit/core/helpers';
import {
	autobind,
	component,
	debounce,
	hook,
	persistent,
	throttle
} from 'jodit/core/decorators';
import { Dom } from 'jodit/core/dom/dom';

@component
export class Emoji extends UIElement<IJodit> {
	/** @override */
	className(): string {
		return 'Emoji';
	}

	private input!: UIInput;
	private categories!: HTMLDivElement;
	private list!: HTMLDivElement;

	private data!: IEmojiData;

	/**
	 * Recent emojis
	 */
	@persistent
	private recent: IEmoji[] = [];

	private map: IDictionary<IEmoji> = {};

	get defaultList(): IEmojiList {
		return (this.recent as IEmojiList).concat(this.data.emoji);
	}

	/**
	 * Reset default state
	 */
	reset(): void {
		this.input.nativeInput.value = '';
		this.setItems(this.defaultList);
		this.setActiveCategory(0);
	}

	private setItems(items: IEmojiList): void {
		this.list.scrollTo(0, 0);

		Dom.detach(this.list);

		Dom.append(
			this.list,
			this.generateEmojiList(items, this.data.categories)
		);
	}

	/** @override */
	protected override createContainer(options?: IDictionary): HTMLElement {
		const container = this.j.c.div('jodit-emoji');

		this.input = new UIInput(this.j, {
			name: 'search',
			icon: 'search',
			autocomplete: false,
			clearButton: true,
			placeholder: 'Search emoji'
		});

		this.input.container.classList.add(this.getFullElName('input'));

		this.categories = this.j.c.div(this.getFullElName('categories'));
		this.list = this.j.c.div(this.getFullElName('emojis'));

		const navigateContainer = this.j.c.div(this.getFullElName('navigate'));

		Dom.append(navigateContainer, [this.categories, this.input.container]);
		Dom.append(container, [navigateContainer, this.list]);

		return container;
	}

	/** @override */
	constructor(jodit: IJodit, private onInsert: (code: string) => void) {
		super(jodit);

		this.setMod('loading', true);

		(async (): Promise<void> => {
			this.data = await jodit.o.emoji.data();
			this.setMod('loading', false);

			this.data.emoji.forEach((e) => {
				const emoji = Emoji.normalizeEmoji(e);
				this.map[emoji.emoji] = emoji;
			});

			this.setItems(this.defaultList);

			Dom.append(
				this.categories,
				this.generateCategoriesList(this.data.categories)
			);

			this.setActiveCategory(0);
		})();
	}

	private static __instance: Emoji | null;

	static getInstance(jodit: IJodit, onInsert: (code: string) => void): Emoji {
		if (!this.__instance) {
			this.__instance = new Emoji(jodit, onInsert);
		}

		this.__instance.onInsert = onInsert;

		if (this.__instance.data) {
			this.__instance.reset();
		}

		return this.__instance;
	}

	private activeIndex = 0;

	private setActiveCategory(
		index: number,
		scrollIntoView: boolean = false
	): void {
		const cats = this.getElms('category'),
			oldActive = cats[this.activeIndex];

		if (!cats[index]) {
			index = cats.length - 1;
		}

		const newActive = cats[index];

		const activeClass = this.getFullElName('category', 'active', true);

		if (oldActive) {
			oldActive.classList.remove(activeClass);
		}

		if (newActive) {
			newActive.classList.add(activeClass);
		}

		if (scrollIntoView) {
			const titles = this.getElms('category-title');
			titles[index].scrollIntoView();
		}

		this.activeIndex = index;
	}

	private generateCategoriesList(categories: string[]): HTMLElement[] {
		return categories.map((cat, i) =>
			this.j.c.div(this.getFullElName('category'), {
				'data-index': i,
				title: cat,
				style: {
					width: 100 / categories.length + '%'
				}
			})
		);
	}

	private cache: IDictionary<HTMLElement> = {};

	private generateEmojiList(
		emojis: Array<IEmoji | IShortEmoji>,
		categories: string[]
	): HTMLElement[] {
		let currentCategory = '';

		return emojis.reduce((acc, emoji, i) => {
			emoji = Emoji.normalizeEmoji(emoji);

			if (categories[emoji.category] !== currentCategory) {
				currentCategory = categories[emoji.category];

				const category =
					this.cache[currentCategory] ??
					this.j.c.div(
						this.getFullElName('category-title'),
						currentCategory ? this.j.i18n(currentCategory) : ''
					);

				this.cache[currentCategory] = category;

				acc.push(category);
			}

			const elm =
				this.cache[emoji.emoji + emoji.category] ??
				this.j.c.div(
					this.getFullElName('emoji'),
					{ 'data-id': i, 'data-value': emoji.emoji },
					emoji.emoji
				);

			this.cache[emoji.emoji + emoji.category] = elm;

			acc.push(elm);

			return acc;
		}, [] as HTMLElement[]);
	}

	private static isShortCat(emoji: IDictionary): emoji is IShortEmoji {
		return emoji && isString(emoji.e);
	}

	static normalizeEmoji(emoji: IShortEmoji | IEmoji): IEmoji {
		if (Emoji.isShortCat(emoji)) {
			return {
				emoji: emoji.e,
				description: emoji.d,
				category: emoji.c,
				aliases: emoji.a,
				tags: emoji.t
			};
		}

		return emoji;
	}

	private onInsertCode(code: string): void {
		this.onInsert(code);

		const emoji = this.map[code];

		// Add emoji in recent list in the first position
		if (emoji) {
			const newRecent = [...this.recent]; // need for persistent storage
			const index = newRecent.findIndex((e) => e.emoji === code);

			if (index !== -1) {
				newRecent.splice(index, 1);
			}

			newRecent.unshift({
				...emoji,
				category: -1
			});

			this.recent = newRecent;
		}
	}

	/**
	 * Scroll handler
	 */
	@throttle()
	private onScrollList(): void {
		const scrollTop = this.list.scrollTop,
			titles = this.getElms('category-title');

		let active = 0;
		titles.forEach((title, index) => {
			const pos = title.offsetTop - this.list.offsetTop - 20;

			if (scrollTop > pos) {
				active = index;
			}
		});

		this.setActiveCategory(active);
	}

	@autobind
	private onClickCategory(e: MouseEvent): void {
		this.clearFilter();

		const target = e.target as HTMLElement;

		if (target.classList.contains(this.getFullElName('category'))) {
			this.setActiveCategory(
				parseInt(attr(target, '-index') || '0', 10) || 0,
				true
			);
		}
	}

	@autobind
	private onClickItem(e: MouseEvent): void {
		const target = e.target as HTMLElement;

		if (target.classList.contains(this.getFullElName('emoji'))) {
			const key = attr(target, '-value') || '';

			if (key) {
				this.onInsertCode(key);
			}
		}

		e.preventDefault();
	}

	@debounce()
	private onInputFilter(): void {
		const value = this.input.value.toLowerCase();

		if (!value.length) {
			return this.setItems(this.defaultList);
		}

		this.setItems(
			this.defaultList.filter((e) => {
				const emoji = Emoji.normalizeEmoji(e);

				return (
					emoji.description?.toLowerCase().includes(value) ||
					emoji.tags?.join(' ').toLowerCase().includes(value) ||
					emoji.aliases?.join(' ').toLowerCase().includes(value)
				);
			})
		);
	}

	private clearFilter(): void {
		if (this.input.nativeInput.value.length) {
			this.reset();
		}
	}

	@hook('ready')
	onReady(): void {
		this.j.e
			.on(this.input.nativeInput, 'input', this.onInputFilter)
			.on(this.categories, 'click', this.onClickCategory)
			.on(this.list, 'scroll', this.onScrollList)
			.on(this.list, 'mousedown touchstart', this.onClickItem);
	}

	/** @override */
	override destruct(): any {
		Emoji.__instance = null;
		this.input.destruct();
		return super.destruct();
	}
}
