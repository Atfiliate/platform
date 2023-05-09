/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IDictionary } from 'jodit/types';
import type { ICaseFn } from '../interface';
import { toArray } from 'jodit/src/core/helpers';

export const processImage: ICaseFn = (elm, ctx) => {
	if (
		ctx.rtf &&
		elm.name === '#comment' &&
		elm.attributes.nodeValue &&
		elm.attributes.nodeValue.indexOf('<v:shape') !== -1
	) {
		if (!ctx.shapes) {
			ctx.shapes = {};
		}

		const elms = ctx.jodit.create.fromHTML(elm.attributes.nodeValue);
		toArray(elms.getElementsByTagName('v:shape')).forEach((e) => {
			ctx.shapes[e.id] = e.getAttribute('o:spid');
		});

		return elm;
	}

	if (elm.name !== 'img') {
		return elm;
	}

	if (ctx.rtf && elm.attributes['v:shapes']) {
		const spid = ctx.shapes?.[elm.attributes['v:shapes']];

		if (spid) {
			if (!ctx.imageMap) {
				ctx.imageMap = {} as ImageMap;
				parseImages(ctx.rtf, 'i', '\\shppict', ctx.imageMap);
				parseImages(ctx.rtf, 's', '\\shp{', ctx.imageMap);
			}

			const a = ctx.imageMap[spid.substring(7)];

			if (a) {
				const base = [],
					parsedD = a.hex.match(/[0-9a-f]{2}/gi);

				if (parsedD) {
					for (let i = 0; i < parsedD.length; i++) {
						base.push(
							String.fromCharCode(parseInt(parsedD[i], 16))
						);
					}

					elm.attributes.src =
						'data:' + a.type + ';base64,' + btoa(base.join(''));
				}
			}
		}
	}

	return elm;
};

type ImageMap = IDictionary<{
	hex: string;
	type: 'image/png' | 'image/jpeg';
}>;

function parseImages(
	rtf: string,
	prefix: 's' | 'i',
	separator: string,
	imageMap: ImageMap
): void {
	const parts = rtf.split(separator);

	for (const part of parts) {
		const shapes = part.split('shplid');

		if (1 < shapes.length) {
			const shape = shapes[1];

			let id: string = '';
			for (
				let i = 0;
				i < shape.length && !/[{ \r\n\\]/.test(shape[i]);
				i++
			) {
				id += shape[i];
			}

			const images = shape.split('bliptag');
			if (images && images.length < 2) {
				continue;
			}

			let format: 'image/png' | 'image/jpeg' | null = null;

			if (images[0].indexOf('pngblip')) {
				format = 'image/png';
			} else if (images[0].indexOf('jpegblip') !== -1) {
				format = 'image/jpeg';
			}

			if (!format) {
				continue;
			}

			const endings = images[1].split('}');

			if (endings && endings.length < 2) {
				continue;
			}

			let result: string[];

			if (2 < endings.length && endings[0].includes('blipuid')) {
				result = endings[1].split(' ');
			} else {
				result = endings[0].split(' ');

				if (result && result.length < 2) {
					continue;
				}

				result.shift();
			}

			imageMap[prefix + id] = {
				hex: result.join(''),
				type: format
			};
		}
	}
}
