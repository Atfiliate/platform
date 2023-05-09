/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
const config = require('jodit-react/webpack.config');
const webpack = require('webpack');
const path = require('path');

module.exports = (env, argv) => {
	const defaultConfig = config(env, argv, __dirname);

	return {
		...defaultConfig,
		resolve: {
			...defaultConfig.resolve,
			alias: {
				...defaultConfig.resolve.alias,
				'jodit-pro': path.join(__dirname, '..', './')
			}
		},
		plugins: [
			...defaultConfig.plugins,
			new webpack.NormalModuleReplacementPlugin(
				/include\.jodit\.js/,
				path.join(__dirname, './include.jodit.js')
			)
		],
		externals: {
			...defaultConfig.externals,
			'jodit-pro/build/jodit.fat.js': 'jodit-pro/build/jodit.fat.js'
		}
	};
};
