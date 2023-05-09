/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { Controls, IJodit } from 'jodit/types';

import { Config } from 'jodit/config';
import { Icon } from 'jodit/core/ui/icon';

import type {
	ITranslateProviderFactory,
	IGoogleTranslateProviderOptions
} from './interface';

declare module 'jodit/config' {
	interface Config {
		translate: {
			hotkeys: {
				translateSelection: string[];
				translateOptions: string[];
			};
			provider: 'google' | ITranslateProviderFactory;
			googleProviderOptions: IGoogleTranslateProviderOptions;
			defaultSourceLang: string;
			defaultTargetLang: string;
		};
	}
}

Config.prototype.translate = {
	hotkeys: {
		translateSelection: ['ctrl+shift+o', 'cmd+shift+o'],
		translateOptions: ['ctrl+shift+p', 'cmd+shift+p']
	},
	provider: 'google',
	googleProviderOptions: {
		url: 'https://translation.googleapis.com/language/translate/v2',
		key: ''
	},
	defaultSourceLang: '',
	defaultTargetLang: 'de'
};

Config.prototype.controls.translate = {
	translate: {
		tooltip: 'Translate selected text',
		icon: 'translate',
		command: 'translate',
		exec(editor): void {
			editor.execCommand('translate');
		},
		list: ['Options'],
		childExec(editor, _, { control }): void {
			editor.execCommand('translate' + control.name);
		},
		mods: {
			stroke: false
		}
	}
} as Controls<IJodit>;

Icon.set('translate', require('./assets/translate.svg')).set(
	'translate-swap',
	require('./assets/swap.svg')
);
