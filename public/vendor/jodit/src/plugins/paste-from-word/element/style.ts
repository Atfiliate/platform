/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { Nullable, IDictionary } from 'jodit/types';
import { isString, kebabCase, trim } from 'jodit/core/helpers';
import { autobind } from 'jodit/core/decorators';
import { calcMarginParts } from '../helpers';

type V = Nullable<number | string>;

@autobind
export class Style {
	private _data: IDictionary<V>;

	constructor(str: string) {
		this._data = readStyles(str);
	}

	get keys(): string[] {
		return Object.keys(this._data);
	}

	forEach(f: (key: string) => void): void {
		this.keys.forEach((key) => f(key));
	}

	clear(): void {
		this._data = {};
	}

	set(key: string, value: V): void {
		this._data[key] = value as string;
	}

	get(key: string): V {
		return this._data[key] ?? null;
	}

	has(key: string): boolean {
		return this._data[key] !== undefined;
	}

	add(key: string, value: string): this {
		this._data = readStyles(this.str() + ';' + `${key}:${value}`);
		return this;
	}

	str(filter: (key: string) => boolean = (k): boolean => true): string {
		const styleKeys = Object.keys(this._data).filter(
			(key) =>
				key &&
				!/^mso-/.test(key) &&
				filter(key) &&
				this.get(key) != null
		);
		const n = (v: string | number): string => {
			if (isString(v)) {
				return /^0[a-z]+$/i.test(v) ? '0' : v;
			}

			return v.toString();
		};

		['padding', 'margin'].forEach((key) => {
			if (this._data[key]) {
				const indexMain = styleKeys.indexOf(key);
				const margins = calcMarginParts(this._data[key] as string);

				['top', 'right', 'bottom', 'left'].forEach((side, index) => {
					const name = `${key}-${side}`,
						value = this._data[name];

					if (
						value != null &&
						(styleKeys.indexOf(name) < indexMain ||
							n(margins[index]) === n(value))
					) {
						styleKeys.indexOf(name) !== -1 &&
							styleKeys.splice(styleKeys.indexOf(name), 1);
					}
				});
			}
		});

		if (styleKeys.length) {
			return styleKeys
				.map((key) => `${kebabCase(key)}:${this.get(key)}`)
				.join(';');
		}

		return '';
	}
}

function readStyles(style?: string): IDictionary {
	return uniqueMax(
		(style ?? '')
			.replace(/&quot;/g, '"')
			.split(';')
			.filter(Boolean)
			.map(
				(s: string) => trim(s).split(':').map(trim) as [string, string]
			)
	).reduce((acc: IDictionary, [key, value]: [string, string]) => {
		if (key && value) {
			acc[key] = value;
		}
		return acc;
	}, {} as IDictionary);
}

function uniqueMax<T extends [string, string]>(array: T[]): T[] {
	const keys: IDictionary<boolean> = {};
	const result: T[] = [];

	for (let i = array.length - 1; i >= 0; i -= 1) {
		const key = array[i][0];
		if (keys[key]) {
			continue;
		}

		keys[key] = true;
		result.unshift(array[i]);
	}

	return result;
}
