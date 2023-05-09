/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.MD in the project root for license information.
 * Copyright (c) 2013-2020 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import { domainsHash } from '../src/plugins/license/license';

export class LicenseGenerator {
	generator(v: 'A' | 'B' | 'C' | 'D', domain: string): string {
		let code;

		const parts = [
			`${this.randomChar('ABCDF01234567', 4)}{part}`,
			`${(code = this.randomChar('0123'))}{part}${this.randomChar(
				'EFGHIJKL45678',
				2
			)}${code}`,
			`${v}{part}${this.randomChar('JKLMNOP56', 3)}`,
			`{part}${this.randomChar(
				'ABCDEFGHIGKLMNOPQR0123456789',
				3
			)}${this.randomChar('XYZ')}`
		];

		const domainsParts = domainsHash(domain);

		return parts
			.map((part, index) => {
				return part.replace(
					'{part}',
					domainsParts[index] || this.randomChar('RST')
				);
			})
			.join('-')
			.toUpperCase();
	}
	private randomChar(chars: string, count: number = 1): string {
		if (count < 1) {
			return '';
		}

		return (
			chars[Math.floor(chars.length * Math.random())] +
			this.randomChar(chars, count - 1)
		);
	}
}
