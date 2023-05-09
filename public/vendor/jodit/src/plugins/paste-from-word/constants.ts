/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

export const LEVEL_KEY = 'jd-list-level';
export const TYPE_KEY = 'jd-list-type';
export const STYLE_KEY = 'jd-list-style-type';
export const STYLE_VALID_KEY = 'data-list-style-type';
export const STYLE_CSS_KEY = 'list-style-type';

export const listStyleMap = {
	'·': 'disc',
	o: 'circle',
	'§': 'square',
	'[ivx]': 'lower-roman',
	'[IVX]': 'upper-roman',
	'[a-z]': 'lower-alpha',
	'[A-Z]': 'upper-alpha',
	'\\d': 'decimal'
} as const;
