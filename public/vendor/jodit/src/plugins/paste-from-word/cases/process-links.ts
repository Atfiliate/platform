/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { ICaseFn } from '../interface';
import type { IDictionary } from 'jodit/src/types';

export const processLinks: ICaseFn = (elm, ctx) => {
	const links: IDictionary = ctx.links ?? {};

	if (elm.attributes.href && elm.attributes.href.match(/#.+$/)) {
		const name = elm.attributes.href.match(/#(.+)$/)[1];
		links[name] = elm;
	}

	if (elm.attributes.name && links[elm.attributes.name]) {
		const link = links[elm.attributes.name];
		link.attributes.href = link.attributes.href.replace(/.*#(.*)$/, '#$1');
	}

	ctx.links = links;

	return elm;
};
