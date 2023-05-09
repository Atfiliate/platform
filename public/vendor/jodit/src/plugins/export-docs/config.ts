/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { AjaxOptions, IControlType, IJodit } from 'jodit/types';
import { Config } from 'jodit/config';
import { Dom } from 'jodit/core/dom';

declare module 'jodit/config' {
	interface Config {
		exportDocs: {
			ajax?: AjaxOptions;

			css: string;

			pdf: {
				allow: boolean;
				options: {
					format: 'A4';
					page_orientation: 'landscape' | 'portrait';
				};
			};
		};
	}
}

Config.prototype.exportDocs = {
	css: '',
	pdf: {
		allow: true,
		options: {
			format: 'A4',
			page_orientation: 'portrait'
		}
	}
};

Config.prototype.controls.exportDocs = {
	tooltip: 'Export',
	isDisabled: (editor: IJodit): boolean => Dom.isEmptyContent(editor.editor),
	icon: require('./assets/export.svg'),
	list: {
		exportToPdf: 'Export to PDF'
	},
	command: 'exportToPDF'
} as IControlType;
