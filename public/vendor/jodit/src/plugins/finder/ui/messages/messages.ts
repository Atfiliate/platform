/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.MD in the project root for license information.
 * Copyright (c) 2013-2020 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './messages.less';

import { UIGroup } from 'jodit/src/core/ui';
import { component } from 'jodit/src/core/decorators';
import { UIBrowserMessage } from './message';
import type { IFileBrowserMessage } from 'jodit/src/types/file-browser';

@component
export class UIBrowserMessages extends UIGroup {
	/** @override */
	className(): string {
		return 'UIBrowserMessages';
	}

	build(items: IFileBrowserMessage[]): void {
		this.clear();

		items.forEach((item) => {
			const message = new UIBrowserMessage(this.jodit, item.message);
			message.setMod('type', item.type);
			this.append(message);
		})
	}
}
