/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './sources.less';

import type { IFileBrowserTreeItemPro } from '../../interface';
import { UIGroup } from 'jodit/core/ui';
import { component } from 'jodit/core/decorators';
import { UIBrowserSource } from '../source/source';

@component
export class UIBrowserSources extends UIGroup {
	/** @override */
	override syncMod: boolean = true;

	/** @override */
	override className(): string {
		return 'UIBrowserSources';
	}

	build(items: IFileBrowserTreeItemPro[]): void {
		this.clear();

		items.forEach((item) => {
			this.append(new UIBrowserSource(this.jodit, item));
		});
	}
}
