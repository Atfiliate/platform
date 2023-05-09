/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import { isPseudoLeaf, JElement } from '../element';
import { LEVEL_KEY } from '../constants';
import { realPixelIndent } from './helpers';

export function calcListLevels(item: JElement): void {
	if (item.attributes[LEVEL_KEY] !== undefined) {
		return;
	}

	const indents: number[] = [realPixelIndent(item)],
		items: JElement[] = [item];

	let next = item.next;
	while (next) {
		if (
			next.isElement &&
			!next.attributes[LEVEL_KEY] &&
			isPseudoLeaf(next)
		) {
			const indent = realPixelIndent(next);
			if (indent) {
				indents.push(indent);
				items.push(next);
			}
		}

		next = next.next;
	}

	const minIndent = Math.min(...indents.filter((val) => val > 0));

	let levels = indents.map((val) => Math.ceil(val / 10));

	if (levels.indexOf(0) !== -1) {
		levels = levels.map((val) => val + 1);
	}

	items.forEach((curItem, index) => {
		curItem.attributes[LEVEL_KEY] = levels[index];
		curItem.style.add(
			'margin-left',
			`${Math.max(
				realPixelIndent(curItem) -
					((levels[index] * 10) / minIndent) * 40,
				0
			)}px`
		);
	});
}
