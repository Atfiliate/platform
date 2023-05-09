/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Jodit PRO Smoke test', function () {
	it('should have global Jodit object', function () {
		expect(typeof Jodit).equals('function');
	});

	it('should make Jodit object', function () {
		expect(typeof new Jodit(appendTestArea())).equals('object');
	});

	it('should have destruct method', function () {
		const jodit = new Jodit(appendTestArea());
		expect(typeof jodit.destruct).equals('function');
	});
});
