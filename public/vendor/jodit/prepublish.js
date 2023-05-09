/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

const fs = require('fs-extra');
const path = require('path');
const PUBLISH = path.resolve(__dirname, './publish');

async function createPublishDirectory() {
	if (await fs.exists(PUBLISH)) {
		await removePublishDirectory();
	}

	await fs.mkdir(PUBLISH);
}

async function removePublishDirectory() {
	await fs.rmdir(PUBLISH, { recursive: true });
}

async function packageJSON() {
	// package.json
	await fs.writeFile(
		path.resolve(PUBLISH, 'package.json'),
		JSON.stringify(
			{
				...require('./package.json'),
				dependencies: {},
				devDependencies: {},
				main: 'build/jodit.js',
				keywords: require('jodit/package.json').keywords,
				scripts: {}
			},
			null,
			'\t'
		)
	);
}

async function copyFiles() {
	await fs.copy('./config.js', path.resolve(PUBLISH, './build/config.js'));
	await fs.copy('./index.html', path.resolve(PUBLISH, 'index.html'));
	await fs.copy('./build', path.resolve(PUBLISH, './build'));
	await fs.copy('./LICENSE.md', path.resolve(PUBLISH, './LICENSE.md'));
	await fs.copy('./README.md', path.resolve(PUBLISH, './README.md'));
	await fs.copy(
		'./node_modules/jodit/examples',
		path.resolve(PUBLISH, './examples')
	);
}

(async () => {
	await createPublishDirectory();
	await packageJSON();
	await copyFiles();
})();
