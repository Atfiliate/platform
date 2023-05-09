/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Show block test', () => {
	describe('Smoke test', function () {
		it('Should have showBlock plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('showBlocks')).equals('function');
		});

		it('Should have showBlock section in controls', () => {
			expect(typeof Jodit.defaultOptions.controls.showBlocks).equals(
				'object'
			);
		});

		it('Should have emoji button in buttons list', () => {
			expect(getButton('showBlocks', getJodit())).is.not.null;
		});
	});
});
