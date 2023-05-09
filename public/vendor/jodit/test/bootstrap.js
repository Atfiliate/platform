/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

window.skipTest = {
	position: true,
	popup: true, // TODO ?
	i18n: true,
	filebrowser: true,
	colorPlugin: true,
	tooltip: true, // TODO ?
	size: true
};

window.toolbarButtonsCount = 54;

// eslint-disable-next-line no-unused-vars
function delay(timeout) {
	return new naturalPromise((resolve) => {
		setTimeout(resolve, timeout);
	});
}

if (typeof module === 'undefined') {
	window.module = {
		exports: {}
	};
}

const urlCache = {};
function requireAsync(url) {
	if (urlCache[url]) {
		return urlCache[url];
	}

	urlCache[url] = new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = url;

		script.onload = () => {
			resolve(module.exports);
		};

		script.onerror = (e) => {
			reject(e);
		};

		document.body.appendChild(script);
	});

	return urlCache[url];
}
