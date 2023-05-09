/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

const superConfig = require('jodit/build-system/index');
const { variables } = require('jodit/build-system/variables');
const { includePlugins } = require('jodit/build-system/utils/include-plugins');
const path = require('path');

module.exports = (env, argv, root = process.cwd(), onlyTs = false) => {
	const { debug, uglify, ES, isTest, excludePlugins } = variables(argv, root);

	argv.filename = (name) =>
		name + (ES === 'es2018' || isTest ? '' : '.' + ES);

	const config = superConfig(env, argv, root, onlyTs);
	const [pluginsEntries] = includePlugins(root);

	excludePlugins.forEach((plugin) => {
		delete pluginsEntries[`./plugins/${plugin}/${plugin}`];
	});

	return {
		...config,
		entry: debug
			? {
					jodit: ['webpack-hot-middleware/client.js', './src/index'],
					...pluginsEntries
			  }
			: {
					'jodit.fat': './src/fat.ts',
					jodit: './src/index',
					...pluginsEntries
			  },
		module: {
			rules: [
				...config.module.rules,
				{
					test: /\.ts$/,
					loader: 'ts-loader',
					options: {
						allowTsInNodeModules: true,
						transpileOnly: uglify,
						compilerOptions: {
							target: ES
						}
					},
					include: [
						path.resolve(root, './src'),
						path.resolve(root, './plugins')
					]
				}
			]
		}
	};
};
