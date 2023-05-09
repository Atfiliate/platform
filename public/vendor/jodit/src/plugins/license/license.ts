/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IViewBased } from 'jodit/types';
import type { IViewOptionsPro } from '../../types/view';
import { Plugin } from 'jodit/core/plugin';
import { Dom } from 'jodit/modules';
import { isBoolean } from 'jodit/core/helpers';
import { validateLicense } from './helpers/helpers';

export class license<
	T extends IViewBased<IViewOptionsPro> = IViewBased<IViewOptionsPro>
> extends Plugin<T> {
	static make(jodit: IViewBased<IViewOptionsPro>): license {
		return new license(jodit);
	}

	/** @override */
	protected afterInit(jodit: T): void {
		this.j.e.on('checkReserve', async () => {
			const code = this.j.o.license,
				domain = location.host;

			let valid = validateLicense(code, domain);

			if (!valid && code[12] > 'A' && !isTest) {
				valid = await this.validateLicenseRemote(code, domain);
			}

			return valid ? 'normal' : '';
		});
	}

	/** @override */
	protected beforeDestruct(jodit: T): void {}

	private async validateLicenseRemote(
		code: string,
		domain: string
	): Promise<boolean> {
		const storageKey = 'validateJoditLicenseRemote',
			newCode = this.j.storage.get<string>(storageKey);

		if (newCode && validateLicense(newCode, domain)) {
			return true;
		}

		const s = document.createElement('script');
		s.src = `https://xdsoft.net/jodit/pro/api/licenses/validate/?code=${encodeURIComponent(
			code
		)}&host=${encodeURIComponent(domain)}`;
		document.body.appendChild(s);

		return new Promise((res) => {
			(window as any)['onJoditResolveKeyCode'] = (
				newCode: string | false
			): void => {
				try {
					if (isBoolean(newCode)) {
						return res(newCode);
					}

					if (validateLicense(newCode, domain)) {
						this.j.storage.set(storageKey, newCode);
						res(true);
					} else {
						res(false);
					}
				} finally {
					Dom.safeRemove(s);
				}
			};

			setTimeout(() => {
				res(false);
				Dom.safeRemove(s);
			}, 3000);
		});
	}
}
