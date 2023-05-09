/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IJodit, IControlType } from 'jodit/types';
import { Config } from 'jodit/config';
import { dataBind } from 'jodit/core/helpers';

declare module 'jodit/config' {
	interface Config {
		mobileView: {
			mode: string | number;
		};
	}
}

Config.prototype.mobileView = {
	mode: 'default'
};

export const dataBindStoredKey = 'buttonmobileSView';
export const dataBindCurrentKey = 'buttonmobileCView';

Config.prototype.controls.mobileView = {
	tooltip: 'Mobile View',
	icon: require('./icon.svg'),
	command: 'mobileView',
	isActive: (editor: IJodit, control): boolean =>
		dataBind(editor, dataBindCurrentKey) &&
		dataBind(editor, dataBindCurrentKey) !== 'default',
	isChildActive: (editor: IJodit, control): boolean => {
		return dataBind(editor, dataBindCurrentKey) === control.args?.[1];
	},
	exec: (editor: IJodit): void | false => {
		if (dataBind(editor, dataBindStoredKey)) {
			editor.execCommand(
				'mobileView',
				false,
				dataBind(editor, dataBindStoredKey)
			);
			return;
		}

		return false;
	},
	childExec: (editor: IJodit, node, btn): void | false => {
		editor.execCommand('mobileView', false, btn.control?.args?.[1]);
	},
	list: [
		{ value: 'default', title: 'Default' },
		{ value: 375, title: 'iPhone SE' },
		{ value: 414, title: 'iPhone XR' },
		{ value: 390, title: 'iPhone 12 Pro' },
		{ value: 393, title: 'Pixel 5' },
		{ value: 820, title: 'iPad Air' }
	]
} as IControlType;
