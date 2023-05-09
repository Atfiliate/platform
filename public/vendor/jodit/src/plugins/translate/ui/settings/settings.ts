/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './settings.less';

import type { IViewBased } from 'jodit/types';
import { UIElement } from 'jodit/core/ui';
import { component, watch } from 'jodit/core/decorators';

import type { ITranslateState } from '../../interface';
import { UITranslateList } from '../list/list';

@component
export class UITranslateSettings extends UIElement {
	private __sourceList: UITranslateList;
	private __targetList: UITranslateList;

	override className(): string {
		return 'UITranslateSettings';
	}

	protected override render(): string {
		return `<div>
			<div class='&__list &__source-list'></div>
			<div class='&__arrow'>
				<a class='&__arrow-swap'>*translate-swap*</a>
			</div>
			<div class='&__list &__target-list'></div>
		</div>`;
	}

	constructor(
		jodit: IViewBased,
		private readonly state: ITranslateState,
		protected readonly options: {
			sourceList: { [key: string]: string };
			targetList: { [key: string]: string };
			onChange: (state: ITranslateState) => void;
		}
	) {
		super(jodit);

		this.__sourceList = new UITranslateList(jodit, {
			list: options.sourceList,
			active: state.sourceLang,
			onChange: (lang: string): void => {
				this.state.sourceLang = lang;
				this.options.onChange({
					...this.state
				});
			}
		});

		this.getElm('source-list')!.appendChild(this.__sourceList.container);

		this.__targetList = new UITranslateList(jodit, {
			list: options.targetList,
			active: state.targetLang,
			onChange: (lang: string): void => {
				this.state.targetLang = lang;
				this.options.onChange({
					...this.state
				});
			}
		});

		this.getElm('target-list')!.appendChild(this.__targetList.container);
	}

	@watch('arrow-swap:click')
	protected __onSwap(): void {
		const tmp = this.state.sourceLang;
		this.state.sourceLang = this.state.targetLang;
		this.state.targetLang = tmp;

		this.__sourceList.state.active = this.state.sourceLang;
		this.__targetList.state.active = this.state.targetLang;

		this.options.onChange({
			...this.state
		});
	}
}
