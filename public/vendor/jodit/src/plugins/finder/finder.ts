/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IJodit } from 'jodit/types';
import type { IFileBrowser } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { FileBrowserPro } from './browser';
import { Jodit } from '../../index';

import './config';

export class finder extends Plugin {
	/** @override */
	override requires = ['license'];

	/** @override */
	override hasStyle = !Jodit.fatMode;

	/** @override */
	protected afterInit(jodit: IJodit): void {
		jodit.e.on('getInstanceFileBrowser', (options) => {
			if (!this.__instance) {
				this.__instance = new FileBrowserPro(options);
			}

			return this.__instance;
		});
	}

	private __instance!: IFileBrowser;

	/** @override */
	protected beforeDestruct(jodit: IJodit): void {
		jodit.e.off('getInstanceFileBrowser');
		this.__instance?.destruct();
	}
}

Jodit.plugins.add('finder', finder);
