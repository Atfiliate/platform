/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { JElement } from './element';
import type { RenderFilter } from '../interface';
import { isBoolean, trim } from 'jodit/core/helpers';

export function html(
	elm: JElement,
	filter: RenderFilter = (): boolean => true,
	removeEmpty: boolean = true,
	allowedStyleProps?: string[]
): string {
	switch (true) {
		case elm.isComment:
		case elm.isText: {
			if (!filter(elm)) {
				return '';
			}

			const { nodeValue } = elm.attributes;

			return elm.isComment ? `<!--${nodeValue}-->` : nodeValue;
		}

		case elm.isElement: {
			const { attributes } = elm,
				innerContent = innerHTML(
					elm,
					filter,
					removeEmpty,
					allowedStyleProps
				);

			// remove empty tag with attributes
			if (
				!elm.attributes['jd-safe'] &&
				removeEmpty &&
				innerContent.replace(/[\n\t]/g, '').length === 0 &&
				!elm.isSingle
			) {
				return '';
			}

			const attrsList = Object.keys(attributes)
				.map((key): string => {
					if (
						key === 'style' ||
						attributes[key] == null ||
						/^jd-/.test(key)
					) {
						return '';
					}

					return `${key}="${htmlEntity(attributes[key])}"`;
				})
				.filter(Boolean);

			const { str: styleStr } = elm.style;

			const styles = htmlEntity(
				styleStr((key) => keyInList(key, allowedStyleProps))
			);

			if (styles) {
				attrsList.push(`style="${styles}"`);
			}

			// unwrap empty tag without attributes
			if (
				removeEmpty &&
				attrsList.length === 0 &&
				['span', 'a'].includes(elm.name)
			) {
				return innerContent;
			}

			const attrs = attrsList.length ? ' ' + attrsList.join(' ') : '';

			if (!filter(elm)) {
				return innerContent;
			}

			return elm.isSingle
				? `<${elm.name}${attrs}/>`
				: `<${elm.name}${attrs}>${innerContent}</${elm.name}>`;
		}

		default:
			// @ts-ignore
			if (!isProd) {
				throw Error('Need implementation for this type');
			}
	}

	return '';
}

function keyInList(key: string, list?: string[]): boolean {
	if (!list) {
		return true;
	}

	if (keyInList.cache.has(list)) {
		const isAllow = keyInList.cache.get(list)?.get(key);
		if (isBoolean(isAllow)) {
			return isAllow;
		}
	}

	const isAllow = list.some((allow) => new RegExp(allow).test(key));

	const map = keyInList.cache.get(list) || new Map();
	map.set(key, isAllow);
	keyInList.cache.set(list, map);

	return isAllow;
}

keyInList.cache = new WeakMap<string[], Map<string, boolean>>();

export function innerHTML(
	elm: JElement,
	filter: RenderFilter = (): boolean => true,
	removeEmpty: boolean = true,
	allowedStyleProps?: string[]
): string {
	let result = elm
		.map((e) => html(e, filter, removeEmpty, allowedStyleProps))
		.join('');

	if (elm.name === 'p' && trim(result).length === 0) {
		result = '&nbsp;';
	}

	return result;
}

function htmlEntity(str: string | number): string {
	return str.toString().replace(/"/g, '&quot;');
}
