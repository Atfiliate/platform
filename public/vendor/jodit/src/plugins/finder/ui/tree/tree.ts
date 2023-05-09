/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './tree.less';

import type { IFileBrowserTreeItemPro } from '../../interface';
import { UIGroup } from 'jodit/core/ui';
import { component } from 'jodit/core/decorators/index';
import { UIBrowserFolder } from '../folder/folder';

@component
export class UITree extends UIGroup {
	/** @override */
	override syncMod: boolean = true;

	/** @override */
	override className(): string {
		return 'UITree';
	}

	constructor(jodit: UIGroup['jodit'], items: IFileBrowserTreeItemPro[]) {
		super(jodit);
		this.build(items);
	}

	private build(items: IFileBrowserTreeItemPro[]): void {
		this.clear();

		items.forEach((item) => {
			const folder = new UIBrowserFolder(this.jodit, item);
			this.append(folder);

			if (item.isActive) {
				folder.setMod('active', true);
			}

			if (item.children.length) {
				this.append(new UITree(this.jodit, item.children));
			}
		});
	}
}
