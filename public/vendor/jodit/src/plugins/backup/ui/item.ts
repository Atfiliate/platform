/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './item.less';

import type { IJodit } from 'jodit/types';
import type { ISnapshotItem } from '../interface';
import { UIElement } from 'jodit/core/ui';
import { attr, isFunction, isString } from 'jodit/core/helpers';

export class UIBackupItem extends UIElement<IJodit> {
	/** @override */
	className(): string {
		return 'UIBackupItem';
	}

	constructor(jodit: IJodit, public data: ISnapshotItem) {
		super(jodit);

		this.container.innerHTML = this.formatDate(data.created);
		attr(this.container, 'tabIndex', 0);
	}

	private formatDate(timestamp: string | Date): string {
		const now = new Date();
		const date = isString(timestamp) ? new Date(timestamp) : timestamp,
			diff = (now.getTime() - date.getTime()) / 1000;

		if (isFunction(this.j.o.backup.formatDate)) {
			return this.j.o.backup.formatDate(date);
		}

		if (diff < 0.2) {
			return this.j.i18n('Current');
		}

		if (diff < 60) {
			return this.j.i18n('Less minute');
		}

		if (diff <= 3600) {
			return this.j.i18n('%s minutes ago', Math.floor(diff / 60));
		}

		if (diff <= 3600 * 24) {
			return this.j.i18n('%s hours  ago', Math.floor(diff / 3600));
		}

		return `${date.toDateString()} ${date.toLocaleTimeString()}`;
	}

	focus(): void {
		this.container.focus();
	}
}
