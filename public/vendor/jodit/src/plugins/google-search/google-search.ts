/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IControlType, IJodit } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Config } from 'jodit/config';
import { trim } from 'jodit/core/helpers';
import { isEditorEmpty } from 'jodit/plugins/placeholder/placeholder';
import { Jodit } from '../../index';

Config.prototype.controls.google = {
	tooltip: 'Google search',
	icon: require('./icon.svg'),
	isDisabled(e: IJodit): boolean {
		return isEditorEmpty(e.editor);
	},
	command: 'startSearch'
} as IControlType;

export class googleSearch extends Plugin {
	/** @override */
	override requires = ['license'];

	/** @override */
	override buttons: Plugin['buttons'] = [
		{
			name: 'google',
			group: 'search'
		}
	];

	/** @override */
	protected afterInit(jodit: IJodit): void {
		jodit.registerCommand('startSearch', {
			exec: () => {
				let query;

				const { s } = jodit;

				if (s.isCollapsed()) {
					query = s.current()?.parentElement?.innerText;
				} else {
					query = s.sel?.toString();
				}

				if (query) {
					const url =
						'https://www.google.com/search?q=' +
						encodeURIComponent(trim(query));
					window.open(url, '_blank');
				}
			}
		});
	}

	/** @override */
	protected beforeDestruct(jodit: IJodit): void {}
}

Jodit.plugins.add('google-search', googleSearch);
