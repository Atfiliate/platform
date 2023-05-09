/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './source.less';

import type { IFileBrowserTreeItemPro } from '../../interface';
import { UIElement } from 'jodit/core/ui';
import { component } from 'jodit/core/decorators';
import { UITree } from '../tree/tree';
import { assert } from 'jodit/src/core/helpers';

@component
export class UIBrowserSource extends UIElement {
	private tree: UITree = new UITree(this.j, this.data.children);

	/** @override */
	syncMod: boolean = true;

	/** @override */
	className(): string {
		return 'UIBrowserSource';
	}

	/** @override */
	protected override render(): string {
		return `<div>
			<div class="&__name"></div>
			<div class="&__tree"></div>
		</div>`;
	}

	constructor(
		jodit: UIElement['jodit'],
		readonly data: IFileBrowserTreeItemPro
	) {
		super(jodit, data);

		const name = this.getElm('name');
		assert(name != null, 'name element does not exists');
		name.innerText = data.title || data.name;

		const tree = this.getElm('tree');
		assert(tree != null, 'tree element does not exists');
		tree.appendChild(this.tree.container);

		jodit.e.on(this.container, 'contextmenu', (e: MouseEvent) => {
			return jodit.e.fire('contextmenuSource.filebrowser', data, e);
		});
	}
}
