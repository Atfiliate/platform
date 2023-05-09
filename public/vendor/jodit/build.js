/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

const fs = require('fs-extra');
const path = require('path');
const fatFile = path.resolve(process.cwd(), './src/fat.ts');
const make = require('./make.js');
const { webpack } = require('webpack');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { variables } = require('jodit/build-system/variables');

const rootPath = process.cwd(),
	config = require(path.resolve(rootPath, './webpack.config.js'));

const argv = yargs(hideBin(process.argv)).option('uglify', {
	type: 'boolean'
}).argv;

const opt = config(
	[],
	{
		mode: 'production',
		uglify: true,
		es: 'es5',
		...argv
	},
	rootPath
);

const { excludePlugins } = variables(argv, rootPath);

(async () => {
	try {
		// Generate Fat file
		await fs.writeFile(
			fatFile,
			`
			import {Jodit as JoditDef} from './index';

			JoditDef.fatMode = true;

			${make.paths
				.filter(
					(entry) =>
						!excludePlugins.includes(
							entry.replace('./src/plugins/', '')
						)
				)
				.map((entry) => {
					const fullPath = path.resolve(process.cwd(), entry);
					const name = path.basename(fullPath);
					const rootPath = path.resolve(process.cwd(), './src');

					return `export * from '${
						fullPath.replace(rootPath, '.') + '/' + name
					}'`;
				})
				.join(';\n')}

			export const Jodit = JoditDef;`
		);

		await new Promise((resolve, reject) => {
			webpack(opt, (err, stats) => {
				if (err) {
					console.log(err);
					reject(err);
				} else {
					console.log(stats.toString({ colors: true }));
					resolve(stats.toString({ colors: true }));
				}
			});
		});
	} finally {
		await fs.unlink(fatFile);
	}
})();
