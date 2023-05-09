/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

export interface IShortEmoji {
	e: string;
	d: string;
	c: number;
	a?: string[];
	t?: string[];
}

export interface IEmoji {
	emoji: string;
	description: string;
	category: number;
	aliases?: string[];
	tags?: string[];
}

export type IEmojiList = Array<IEmoji | IShortEmoji>;

export interface IEmojiData<T = IEmojiList> {
	categories: string[];
	emoji: T;
}
