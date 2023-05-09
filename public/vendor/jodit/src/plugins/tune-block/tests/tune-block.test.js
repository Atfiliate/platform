/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

// TODO
describe('Tune block test', () => {
	describe('Smoke test', function () {
		it('Should have tuneBlock plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('tuneBlock')).equals('function');
		});
	});
});
