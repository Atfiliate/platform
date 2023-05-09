/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { JElement } from '../element';
import type { Nullable } from 'jodit/types';
import { calcListLevels, calcStartBySymbol } from '../helpers';
import { isLeaf, isList, isPseudoLeaf, isSameType, html } from '../element';
import { SPACE_REG_EXP } from 'jodit/core/constants';
import {
	LEVEL_KEY,
	listStyleMap,
	STYLE_CSS_KEY,
	STYLE_KEY,
	STYLE_VALID_KEY,
	TYPE_KEY
} from '../constants';

export function convertToList(elm: JElement): JElement | null {
	if (isPseudoLeaf(elm)) {
		elm.name = 'li';
		elm.style.set('text-indent', null);

		const symbol = getSymbol(elm),
			listType = /[\da-np-zA-NP-Z].?/.test(symbol) ? 'ol' : 'ul',
			listStyle = defineOrderedListStyle(symbol, listType);

		elm.attributes[TYPE_KEY] = listType;
		elm.attributes[STYLE_KEY] = listStyle;

		calcListLevels(elm);
		moveUp(elm);

		const { parent } = elm;

		// After move up we inside List or Leaf
		if (!isList(parent) || !isSameType(elm, parent)) {
			const newList = wrapInNewList(elm, listType, symbol, listStyle);

			if (isList(parent)) {
				newList.remove(); // Not to add to oneself
				parent.lastElement?.append(newList);
			}

			return elm;
		}
	}

	return elm;
}

function moveUp(leaf: JElement): void {
	// eslint-disable-next-line no-constant-condition
	while (leaf) {
		const prev = leaf.previousElement;

		// Leaf after P
		if (!(isLeaf(prev) || isList(prev))) {
			break;
		}

		// Leaf after Leaf
		if (isLeaf(prev)) {
			if (leaf.attributes[LEVEL_KEY] < prev.attributes[LEVEL_KEY]) {
				break;
			}

			// Leaf after leaf with same level and inside the right list
			if (
				leaf.attributes[LEVEL_KEY] === prev.attributes[LEVEL_KEY] &&
				leaf.parent &&
				isSameType(leaf, leaf.parent)
			) {
				break;
			}

			prev.append(leaf);
			continue;
		}

		const list = prev;

		// Leaf after list with more level
		if (leaf.attributes[LEVEL_KEY] < list.attributes[LEVEL_KEY]) {
			break;
		}

		if (
			leaf.attributes[LEVEL_KEY] === list.attributes[LEVEL_KEY] &&
			!isSameType(leaf, list)
		) {
			break;
		}

		list.append(leaf);
	}
}

/**
 * Remove redundancy default list styles.
 */
export function removeRedundancyStyle(newList: JElement): void {
	if (
		isList(newList) &&
		newList.parent?.name !== 'li' &&
		(newList.style.get(STYLE_CSS_KEY) === 'disc' ||
			newList.style.get(STYLE_CSS_KEY) === 'decimal')
	) {
		newList.style.set(STYLE_CSS_KEY, null);
	}
}

function defineOrderedListStyle(
	symbol: string,
	listType: 'ul' | 'ol'
): Nullable<string> {
	for (const reg in listStyleMap) {
		if (RegExp(reg).test(symbol)) {
			return (listStyleMap as any)[reg];
		}
	}

	return listType === 'ol' ? 'decimal' : 'disc';
}

const getSymbol = (elm: JElement): string =>
	elm
		.textBetween(
			(n) => n.isComment && /\[if.*supportLists.*]/.test(html(n)),
			(n) => n.isComment && /\[endif]/.test(html(n))
		)
		.replace(/&nbsp;/g, '')
		.replace(SPACE_REG_EXP(), '');

function wrapInNewList(
	elm: JElement,
	listType: string,
	symbol: string,
	listStyle: Nullable<string>
): JElement {
	const newList = elm.wrap(listType);
	newList.attributes['start'] = calcStartBySymbol(symbol);
	newList.attributes[LEVEL_KEY] = elm.attributes[LEVEL_KEY];
	newList.attributes[STYLE_KEY] = elm.attributes[STYLE_KEY];
	newList.attributes[STYLE_VALID_KEY] = elm.attributes[STYLE_KEY];
	newList.style.set(STYLE_CSS_KEY, listStyle);

	removeRedundancyStyle(newList);

	return newList;
}
