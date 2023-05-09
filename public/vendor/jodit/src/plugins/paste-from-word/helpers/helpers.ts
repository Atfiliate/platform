/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { Nullable } from 'jodit/types';
import type { JElement } from '../element';

export function calcMarginParts(margin: string): number[] | string[] {
	if (!margin) {
		return [0, 0, 0, 0];
	}

	const widths = margin.match(/(0|auto|(-?[.\d]+(?:\w+|%)))/g) || ['0px'];

	switch (widths.length) {
		case 2:
			return [0, 1, 0, 1].map((index) => widths[index]);
		case 3:
			return [0, 1, 2, 1].map((index) => widths[index]);
		case 4:
			return [0, 1, 2, 3].map((index) => widths[index]);
		default:
			return [0, 0, 0, 0].map((index) => widths[index]);
	}
}

let fakeMeasureBox: HTMLElement | null;

/**
 * Convert css units to pixels, excluding percentages
 * @example
 * ```js
 * convertUnitToPx('55pt')
 * convertUnitToPx('55cm')
 * ```
 */
export function convertUnitToPx(unit: string | number): number {
	if (typeof unit === 'number') {
		return unit;
	}

	if (/%$/.test(unit)) {
		return 0;
	}

	if (!fakeMeasureBox) {
		fakeMeasureBox = document.createElement('div');
		Object.assign(fakeMeasureBox.style, {
			position: 'absolute',
			left: '-9999px',
			top: '-9999px',
			margin: '0',
			padding: '0',
			border: '0'
		});

		document.body.append(fakeMeasureBox);

		// Clean after work
		setTimeout(() => {
			fakeMeasureBox?.remove();
			fakeMeasureBox = null;
		});
	}

	const isNegative = parseFloat(unit) < 0;

	if (isNegative) {
		unit = unit.replace('-', '');
	}

	fakeMeasureBox.style.width = unit;
	const result = fakeMeasureBox.clientWidth;

	if (isNegative) {
		return -result;
	}

	return result;
}

export function realPixelIndent(element: JElement): number {
	const { style } = element;

	let marginSplit: any = [0, 0, 0, 0];

	const marginKeys = style.keys.filter((k) => /margin/.test(k));
	const maxMarginLeftIndex = Math.max(
		marginKeys.indexOf('margin-left'),
		marginKeys.indexOf('margin')
	);
	const marginKey =
		maxMarginLeftIndex > 0 ? marginKeys[maxMarginLeftIndex] : 'margin-left';

	let marginLeft;

	if (marginKey === 'margin') {
		const margin = style.get('margin') as string;
		marginSplit = calcMarginParts(margin);
		marginLeft = marginSplit[3] || 0;
	} else {
		marginLeft = style.get(marginKey) || 0;
	}

	return convertUnitToPx(marginLeft);
}

export function calcStartBySymbol(symbol: string): Nullable<string> {
	if (/\d.\d/.test(symbol)) {
		return symbol.split('.').pop() || null;
	}

	if (/^\d/.test(symbol)) {
		return (parseInt(symbol, 10) || 1).toString();
	}

	return null;
}
