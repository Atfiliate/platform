/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { ISnapshotStorage } from './interface';
import type { IControlType, IDictionary, IJodit } from 'jodit/types';
import { Config } from 'jodit/config';
import { Icon } from 'jodit/core/ui/icon';
import { extendLang } from 'jodit/core/global';

declare module 'jodit/config' {
	interface Config {
		backup: {
			interval: number;
			limit: number;
			remoteStore?: ISnapshotStorage;
			dialogWidth: number;
			hotkeys: string[];
			formatDate?: (timestamp: string | Date) => string;
		};
	}
}

Config.prototype.backup = {
	interval: 30,
	limit: 50,
	dialogWidth: 700,
	hotkeys: ['ctrl+shift+b', 'cmd+shift+b']
};

Config.prototype.controls.backup = {
	store: {
		command: 'saveBackup',
		text: 'Save backup now'
	},
	restore: {
		tooltip: 'Restore',
		list: ['backup.store'],
		exec(editor: IJodit): void {
			editor.execCommand('openBackupDialog');
		}
	}
} as IDictionary<IControlType>;

Icon.set('restore', require('./assets/restore.svg'));
extendLang(require('./langs'));
