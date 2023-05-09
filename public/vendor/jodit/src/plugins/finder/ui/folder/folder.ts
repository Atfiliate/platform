/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './folder.less';

import type { IFileBrowserTreeItemPro } from '../../interface';
import { UIElement } from 'jodit/core/ui';
import { component } from 'jodit/core/decorators/index';
import { assert } from 'jodit/src/core/helpers';

@component
export class UIBrowserFolder extends UIElement {
	/** @override */
	syncMod: boolean = true;

	/** @override */
	override className(): string {
		return 'UIBrowserFolder';
	}

	/** @override */
	protected override render(): string {
		return `<div>
			<div class="&__icon">
				<div class='&__loader'></div>
				<div class="&__icon-wrapper">
					*folder*
				</div>
			</div>
			<div class="&__name"></div>
			<div class="&__arrow">*angle-right*</div>
		</div>`;
	}

	constructor(
		jodit: UIElement['jodit'],
		readonly item: IFileBrowserTreeItemPro
	) {
		super(jodit);
		const name = this.getElm('name');
		assert(name != null, 'name element does not exists');
		name.innerText = item.name;

		jodit.e
			.on(this.container, 'click', () => {
				if (!this.getMod('active')) {
					this.setMod('loading', true);
				}

				return jodit.e.fire('openFolder', item);
			})
			.on(this.container, 'contextmenu', (e: MouseEvent) => {
				return jodit.e.fire('contextmenuFolder.filebrowser', item, e);
			});
	}
}
