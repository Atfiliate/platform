/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

export interface ISnapshotItem {
	created: Date;
	html: string;
}

export interface ISnapshotStorage<T extends ISnapshotItem = ISnapshotItem> {
	add(item: T): Promise<boolean>;
	clear(): Promise<boolean>;
	items(): Promise<T[]>;
}
