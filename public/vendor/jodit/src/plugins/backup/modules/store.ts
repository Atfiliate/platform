/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { ISnapshotItem, ISnapshotStorage } from '../interface';
import type { IJodit } from 'jodit/types';

export class DefaultStorage implements ISnapshotStorage {
	private key = 'backup.default.storage';

	constructor(private jodit: IJodit) {}

	async add(item: ISnapshotItem): Promise<boolean> {
		if (!item.html.trim().length) {
			return false;
		}

		const items = this.jodit.storage.get<ISnapshotItem[]>(this.key) || [];

		if (items.find((elm) => elm.html === item.html)) {
			return false;
		}

		items.unshift(item);

		if (items.length > this.jodit.o.backup.limit) {
			items.length = this.jodit.o.backup.limit;
		}

		this.jodit.storage.set(this.key, items);

		return false;
	}

	items(): Promise<ISnapshotItem[]> {
		return Promise.resolve(
			this.jodit.storage.get<ISnapshotItem[]>(this.key) || []
		);
	}

	clear(): Promise<boolean> {
		this.jodit.storage.delete(this.key);
		return Promise.resolve(false);
	}
}
