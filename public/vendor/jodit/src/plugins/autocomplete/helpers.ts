/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import { Dom } from 'jodit/core/dom/dom';

/**
 * For collapsed selection return left text value before cursor
 * @example
 * ```
 * <p><string>test</strong>pop|</p> => pop
 * <p><string>test|</strong>pop</p> => test
 * <p><string>te|st</strong>pop</p> => te
 * ```
 */
export function getTextLeftOfCursor(range: Range): string {
	const { startContainer, startOffset } = range;

	if (Dom.isText(startContainer)) {
		return startContainer.nodeValue?.substr(0, startOffset) ?? '';
	}

	const node = startContainer.childNodes[startOffset];

	if (!node) {
		return '';
	}

	if (Dom.isText(node)) {
		return node.nodeValue ?? '';
	}

	const previous = Dom.findNotEmptyNeighbor(
		node,
		true,
		startContainer as HTMLElement
	);

	if (Dom.isText(previous)) {
		return node.nodeValue ?? '';
	}

	return '';
}

/**
 * For collapsed selection replace part of left text value before cursor but started after space
 * @example
 * ```
 * <p><string>test</strong>pap|</p> + pappy = <p><string>test</strong>pappy|</p>
 * <p><string>test</strong>pap| test</p> + pappy = <p><string>test</strong>pappy| test</p>
 * <p><string>test</strong>stat pap| test</p> + pappy = <p><string>test</strong>stat pappy| test</p>
 * ```
 */
export function replaceTextLeftOfCursorAfterSpace(
	range: Range,
	elm: Node
): void {
	// eslint-disable-next-line prefer-const
	let { startContainer, startOffset } = range;

	if (!Dom.isText(startContainer)) {
		startContainer = startContainer.childNodes[startOffset - 1];
		if (Dom.isText(startContainer)) {
			startOffset = startContainer.nodeValue?.length ?? 0;
		}
	}

	if (Dom.isText(startContainer)) {
		const value = startContainer.nodeValue ?? '',
			leftSide = value.substring(0, startOffset),
			rightSide = value.substring(startOffset);

		const words = leftSide.split(' ');

		words[words.length - 1] = '';

		const newLeftSide = words.join(' ');

		startContainer.nodeValue = newLeftSide + rightSide;

		range.setStart(startContainer, newLeftSide.length);

		range.insertNode(elm);

		return;
	}
}
