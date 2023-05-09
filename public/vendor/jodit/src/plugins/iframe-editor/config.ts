/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IViewBased, Nullable } from 'jodit/types';
import { Config } from 'jodit/config';
import { Dom } from 'jodit/core/dom';
import { isArray } from 'jodit/core/helpers';

Config.prototype.controls.iframeEditor = {
	icon: require('./icon.svg'),
	tooltip: 'Iframe Editor',
	exec: (editor: IViewBased, iframe: Nullable<Node>): void => {
		if (
			Dom.isTag(iframe, 'jodit') &&
			Dom.isTag(iframe.firstElementChild, 'iframe')
		) {
			iframe = iframe.firstElementChild;
		}

		editor.e.fire(
			'toggleIframeEditor',
			Dom.isTag(iframe, 'iframe') ? iframe : null
		);
	}
};

// @ts-ignore
if (isArray(Config.prototype.popup.iframe)) {
	// @ts-ignore
	Config.prototype.popup.iframe.push('iframeEditor');
}
