/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IViewBased } from 'jodit/types';
import { Config } from 'jodit/config';

declare module 'jodit/config' {
	interface Config {
		showBlocks: {
			enable: boolean;
			color: string;
			tagList: string[];
		};
	}
}

Config.prototype.showBlocks = {
	enable: false,
	color: '#ccc',
	tagList: [
		'html',
		'body',
		'div',
		'span',
		'applet',
		'object',
		'iframe',
		'h1',
		'h2',
		'h3',
		'h4',
		'h5',
		'h6',
		'p',
		'blockquote',
		'pre',
		'a',
		'abbr',
		'acronym',
		'address',
		'big',
		'cite',
		'code',
		'del',
		'dfn',
		'em',
		'img',
		'ins',
		'kbd',
		'q',
		's',
		'samp',
		'small',
		'strike',
		'strong',
		'sub',
		'sup',
		'tt',
		'var',
		'b',
		'u',
		'i',
		'center',
		'dl',
		'dt',
		'dd',
		'fieldset',
		'form',
		'label',
		'legend',
		'caption',
		'th',
		'td',
		'li',
		'ol',
		'ul',
		'article',
		'aside',
		'canvas',
		'details',
		'embed',
		'figure',
		'figcaption',
		'footer',
		'header',
		'hgroup',
		'menu',
		'nav',
		'output',
		'ruby',
		'section',
		'summary',
		'time',
		'mark',
		'audio',
		'video'
	]
};

Config.prototype.controls.showBlocks = {
	isActive(editor: IViewBased): boolean {
		return Boolean(editor.e.fire('showBlocksEnabled'));
	},
	tooltip: 'Show Blocks',
	command: 'toggleShowBlocks'
};
