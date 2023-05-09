/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './list.less';

import type { IViewBased } from 'jodit/types';
import { UIElement } from 'jodit/core/ui/element';
import { component, debounce, watch } from 'jodit/core/decorators';
import { Dom } from 'jodit/core/dom/dom';
import { attr } from 'jodit/core/helpers/utils/utils';
import { UIInput } from 'jodit/core/ui/form/inputs/input/input';
import { scrollIntoViewIfNeeded } from 'jodit/core/helpers';
import { KEY_ENTER } from 'jodit/core/constants';

@component
export class UITranslateList extends UIElement {
	override className(): string {
		return 'UITranslateList';
	}

	state: {
		active: string;
	} = {
		active: ''
	};

	private get items(): HTMLElement[] {
		return this.getElms('item');
	}

	protected override render(options: UITranslateList['options']): string {
		const list: string[] = [];

		Object.keys(options.list)
			.sort()
			.forEach((lang) => {
				const key = options.list[lang];
				list.push(
					`<a role='button' tabindex='0' class='&__item' data-lang='${key}'>
						<span class='&__item-key'>${key}</span>
						<span class='&__item-title'>${this.j.i18n(lang)}</span>
					</a>`
				);
			});

		return `<div class='&'>
			<div class='&__input'></div>
			<div class='&__list'>${list.join('')}</div>
		</div>`;
	}

	constructor(
		jodit: IViewBased,
		protected readonly options: {
			list: { [key: string]: string };
			active: string;
			onChange: (lang: string) => void;
		}
	) {
		super(jodit, options);
		this.state.active = options.active;

		const input = new UIInput(jodit, {
			placeholder: jodit.i18n('Filter'),
			icon: 'search',
			onChange: this.__onChangeFilter,
			clearButton: true
		});

		this.getElm('input')!.appendChild(input.container);
		this.__onActiveChange();
	}

	@debounce()
	private __onChangeFilter(value: string): void {
		this.items.forEach((elm) => {
			const key = elm.textContent?.toLowerCase() ?? '';
			attr(
				elm,
				'data-hidden',
				attr(elm, 'data-active') !== 'true' &&
					!key.includes(value.toLowerCase())
			);
		});
	}

	@watch(':afterOpen')
	private __scrollToActive(): void {
		const active = this.container.querySelector('[data-active="true"]');
		active &&
			scrollIntoViewIfNeeded(active, this.getElm('list')!, this.j.od);
	}

	@watch(['container:click', 'container:keydown'])
	protected onClickItem(e: MouseEvent | KeyboardEvent): void {
		if (e.type === 'keydown' && 'key' in e && e.key !== KEY_ENTER) {
			return;
		}

		const target = e.target as HTMLElement;

		if (Dom.isHTMLElement(target) && target.getAttribute('data-lang')) {
			const newValue = attr(target, 'data-lang') as string;
			this.options.onChange(newValue);
			this.state.active = newValue;
		}
	}

	@watch('state.active')
	@debounce()
	private __onActiveChange(): void {
		this.items.forEach((elm) =>
			attr(
				elm,
				'data-active',
				attr(elm, 'data-lang') === this.state.active
			)
		);
		this.__scrollToActive();
	}
}
