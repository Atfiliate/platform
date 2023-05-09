/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { CanPromise, IDictionary } from 'jodit/types';

export interface IAutoCompleteItem<T = IDictionary> {
	value: string;
	title?: string;
	itemRenderer?: (item: T) => string | HTMLElement;
	insertValueRenderer?: (item: T) => string | HTMLElement;
}

export type AutoCompleteCallback<T> = (query: string) => CanPromise<T[]>;

export interface IAutoCompleteCustomFeed<T> {
	feed:
		| CanPromise<string[]>
		| CanPromise<IAutoCompleteItem[]>
		| AutoCompleteCallback<T>;
	itemRenderer?: IAutoCompleteItem<T>['itemRenderer'];
	insertValueRenderer?: IAutoCompleteItem<T>['insertValueRenderer'];
}

export type AutoCompleteSource<T = IAutoCompleteItem> =
	| IAutoCompleteCustomFeed<T>['feed']
	| IAutoCompleteCustomFeed<T>;
