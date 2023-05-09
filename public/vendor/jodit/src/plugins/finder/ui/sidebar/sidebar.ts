/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import './sidebar.less';

import type { IUIElement, IViewBased } from 'jodit/types';
import type { IFileBrowserStatePro } from '../../interface';
import { UIGroup } from 'jodit/core/ui';
import { component, debounce, hook, watch } from 'jodit/core/decorators';
import { UIResize } from '../../../../traits/resize/resize';
import { assert } from 'jodit/src/core/helpers';

@component
export class UISidebar extends UIGroup implements UIResize {
	/** @override */
	override className(): string {
		return 'UISidebar';
	}

	/** @override */
	protected override render(): string {
		return `<div>
			<div class='&__hide-btn'>*angle-left*</div>
			<div class='&__favorites'>*heart* ~Favorites~</div>
			<div class='&__box'></div>
		</div>`;
	}

	/** @override */
	protected override appendChildToContainer(
		childContainer: HTMLElement
	): void {
		const box = this.getElm('box');
		assert(box != null, 'box element does not exists');
		box.appendChild(childContainer);
	}

	/**
	 * Add handle resizer
	 */
	@hook('ready')
	@watch(':resize', window)
	@debounce()
	addResize(): void {
		UIResize.remove(this);
		UIResize.install(this, screen.width > 450 ? 'right' : 'bottom');
	}

	constructor(
		jodit: IViewBased,
		elements: Array<IUIElement | void | null | false>,
		readonly state: IFileBrowserStatePro
	) {
		super(jodit, elements);
		this.onChangeFavorites();
	}

	@watch('state.favorites')
	private onChangeFavorites(): void {
		this.setMod('has-favorites', Boolean(this.state.favorites.length));
	}

	@watch('hide-btn:click')
	protected onClickHideButton(): false {
		this.state.showSideBar = !this.state.showSideBar;
		return false;
	}

	@watch('favorites:click')
	protected onClickFavorites(): false {
		this.state.elements = this.state.favorites;
		return false;
	}
}
