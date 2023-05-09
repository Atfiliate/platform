/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.MD in the project root for license information.
 * Copyright (c) 2013-2020 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IViewBased } from 'jodit/src/types';
import { UIElement } from 'jodit/src/core/ui';
import { component } from 'jodit/src/core/decorators/index';
import { isString } from 'jodit/src/core/helpers';

@component
export class UIBrowserMessage extends UIElement {
	className(): string {
		return 'UIBrowserMessage';
	}

	constructor(jodit: IViewBased, message: string | Error) {
		super(jodit);
		this.container.innerText = isString(message) ? message : message.message;
	}
}
