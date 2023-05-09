/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IControlType, IDictionary } from 'jodit/types';
import type { IFileBrowserPro } from './interface';
import { Config } from 'jodit/config';
import { extendLang } from 'jodit/core/global';

extendLang(require('./langs'));

const fb = Config.prototype.controls.filebrowser as IDictionary<
	IControlType<IFileBrowserPro>
>;

fb.settings = {
	icon: 'settings',
	tooltip: 'Settings',
	exec: (editor) => {
		const view = editor.parent ?? editor;
		view.e.fire('toggleSettings.filebrowser');
	}
} as IControlType<IFileBrowserPro>;

fb.home = {
	icon: 'home',
	tooltip: 'Home',
	exec: (editor) => {
		editor.e.fire('goHome.filebrowser');
	}
} as IControlType<IFileBrowserPro>;

fb.preview = {
	icon: 'eye',
	tooltip: 'Preview',
	isDisabled(fb) {
		return fb.state.activeElements.length === 0;
	},
	exec: (editor) => {
		editor.e.fire('togglePreview.filebrowser');
	}
} as IControlType<IFileBrowserPro>;

fb.next = {
	icon: 'angle-right',
	tooltip: 'History next',
	isDisabled: (browser): boolean => !browser.historyManager.canNext(),
	exec: (editor) => {
		editor.historyManager.next();
	}
} as IControlType<IFileBrowserPro>;

fb.previous = {
	icon: 'angle-left',
	tooltip: 'History previous',
	isDisabled: (browser): boolean => !browser.historyManager.canPrevious(),
	exec: (editor) => {
		editor.historyManager.previous();
	}
} as IControlType<IFileBrowserPro>;

fb['new-folder'] = {
	icon: 'new-folder',
	exec: (editor) => {
		editor.e.fire('folderCreate.filebrowser', {
			path: editor.state.currentPath,
			sourceName: editor.state.currentSource
		});
	},
	tooltip: 'New folder'
} as IControlType<IFileBrowserPro>;

Object.assign(Config.prototype.filebrowser, {
	buttons: [
		'filebrowser.home',
		'filebrowser.previous',
		'filebrowser.next',
		'|',
		'filebrowser.upload',
		'filebrowser.new-folder',
		'filebrowser.remove',
		'filebrowser.update',
		'filebrowser.select',
		'filebrowser.edit',
		'|',
		'filebrowser.preview',
		'about'
	],
	sort: false,
	pixelOffsetLoadNewChunk: 300,
	width: 800,
	height: 400,
	previewOfficeURL: 'https://view.officeapps.live.com/op/view.aspx?src='
});
