/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import type { IControlType, IJodit } from 'jodit/types';
import type { IEmojiData } from './interface';
import { Config } from 'jodit/config';

import { Emoji } from './ui/emoji';

declare module 'jodit/config' {
	interface Config {
		emoji: {
			data: () => Promise<IEmojiData>;
			enableAutoComplete: boolean;
			recentCountLimit: number;
		};
	}
}

Config.prototype.emoji = {
	data: (): any => require('./emoji.json'),
	enableAutoComplete: true,
	recentCountLimit: 10
};

Config.prototype.controls.emoji = {
	tooltip: 'Insert Emoji',
	icon: require('./emoji.svg'),
	popup: (editor: IJodit, _: any, _1: any, close: any): HTMLElement => {
		editor.s.save();

		const box = Emoji.getInstance(editor, (code) => {
			editor.s.restore();
			editor.s.insertNode(editor.createInside.text(code), true);
			close();
		});

		// @ts-ignore
		editor.e.one('beforePopupClose', () => {
			editor.s.restore();
		});

		return box.container;
	}
} as unknown as IControlType;
