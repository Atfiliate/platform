/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import { Config } from 'jodit/config';

declare module 'jodit/config' {
	interface Config {
		pasteFromWord: {
			/**
			 * Turn off heuristic analysis when pasting from word
			 */
			enable: boolean;

			/**
			 * Convert units to px
			 */
			convertUnitsToPixel: boolean;

			/**
			 * List of attributes which should not be removed when pasting from word
			 */
			allowedStyleProps?: string[];
		};
	}
}

Config.prototype.pasteFromWord = {
	enable: false,
	convertUnitsToPixel: false,
	allowedStyleProps: [
		'background',
		'background-color',
		'border',
		'border-.*',
		'color',
		'float',
		'font-family',
		'font-size',
		'font-style',
		'font-weight',
		'height',
		'line-height',
		'list-style-type',
		'margin',
		'margin-bottom',
		'margin-left',
		'margin-right',
		'margin-top',
		'padding',
		'text-align',
		'text-justify',
		'text-decoration',
		'text-indent',
		'vertical-align',
		'width'
	]
};
