/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IViewBased, Nullable } from 'jodit/types';
import { Config } from 'jodit/config';
import { isArray } from 'jodit/core/helpers/checker';

Config.prototype.controls.buttonGenerator = {
	tooltip: 'Button generator',
	icon: require('./icon.svg'),
	isActive(editor: IViewBased): boolean {
		return Boolean(editor.e.fire('isButtonGeneratorOpened'));
	},
	exec: (editor: IViewBased, btn: Nullable<Node>): void => {
		editor.e.fire('toggleButtonGenerator', btn);
	}
};

// @ts-ignore
Config.prototype.popup.button = ['buttonGenerator'];

// @ts-ignore
if (isArray(Config.prototype.popup.a)) {
	// @ts-ignore
	Config.prototype.popup.a.push('buttonGenerator');
}
