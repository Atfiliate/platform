/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IControlType } from 'jodit/types';
import { Config } from 'jodit/config';

const styles = require('!!raw-loader!./page-break.css').default;

declare module 'jodit/config' {
	interface Config {
		pageBreak: {
			separator: string;
		};
	}
}

Config.prototype.pageBreak = {
	separator: '<div style="page-break-before: always"></div>'
};

Config.prototype.controls.pageBreak = {
	tooltip: 'Insert page break',
	icon: require('./assets/page-break.svg'),
	command: 'insertPageBreak'
} as IControlType;

// @ts-ignore
Config.prototype.iframeStyle = String(Config.prototype.iframeStyle) + styles;
