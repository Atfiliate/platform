/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IControlType, IJodit } from 'jodit/types';
import { Config } from 'jodit/config';
import { dataBind } from 'jodit/core/helpers/index';

Config.prototype.controls.changeCase = {
	tooltip: 'Change case',
	icon: require('./icon.svg'),
	list: ['lowercase', 'UPPERCASE', 'Title Case'],
	isDisabled(e: IJodit): boolean {
		return !e.s.current();
	},
	exec(jodit: IJodit, current, { control }): void | false {
		const key = control.command + 'Selected',
			mode = (control.args && control.args[0]) || dataBind(jodit, key);

		if (!mode || !control.command) {
			return false;
		}

		dataBind(jodit, key, mode);

		jodit.execCommand(control.command, null, mode);
	},
	command: 'changeCase'
} as IControlType;
