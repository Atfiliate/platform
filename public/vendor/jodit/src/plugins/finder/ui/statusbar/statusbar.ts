/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './statusbar.less';

import { UIElement } from 'jodit/core/ui';
import { component } from 'jodit/core/decorators';
import { assert } from 'jodit/core/helpers';

@component
export class UIBrowserStatusBar extends UIElement {
	/** @override */
	override className(): string {
		return 'UIBrowserStatusBar';
	}

	/** @override */
	protected override render(): string {
		return `<div>
			<div class='&__slot-left'></div>
			<div class='&__slot-center'></div>
			<div class='&__slot-right'></div>
		</div>`;
	}

	value(text: string, slot: 'left' | 'center' | 'right' = 'left'): this {
		const slotElm = this.getElm(`slot-${slot}`);
		assert(slotElm != null, 'Slot does not exists');
		slotElm.innerText = text;
		return this;
	}
}
