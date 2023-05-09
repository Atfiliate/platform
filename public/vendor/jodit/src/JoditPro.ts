/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './index.less';

import { Jodit } from 'jodit/index';
import { appendScriptAsync, css } from 'jodit/core/helpers/utils';

import './config';

export class JoditPro extends Jodit {
	static override fatMode: boolean = false;

	override beforeInitHook(): Promise<void> | void {
		if (isProd && !isTest) {
			return appendScriptAsync(this, this.basePath + 'config.js');
		}

		return;
	}

	override async afterInitHook(): Promise<void> {
		if ((await this.e.fire('checkReserve')) !== 'normal') {
			if (this.isInDestruct) {
				return;
			}

			const message =
				'Trial version. Buy <a href="https://xdsoft.net/jodit/pro/">Jodit Pro</a>';

			const pro = this.c.div('', message);

			if (!isTest && isProd) {
				console.error(message);
			}

			css(pro, {
				position: 'absolute',
				color: 'red',
				right: 10,
				bottom: 10
			});

			this.addDisclaimer(pro);
		}

		super.afterInitHook();
	}

	/** @override */
	override getVersion(): string {
		return 'PRO ' + appVersion;
	}
}
