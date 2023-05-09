/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IJodit } from 'jodit/types';
import { $$, attr } from 'jodit/core/helpers';
import { Dom } from 'jodit/core/dom/dom';
import { transformWordToHtml } from './transform-word-to-html';
import { JElement } from '../element';

export function applyStylesPro(
	jodit: IJodit,
	html: string,
	removeStyles: boolean,
	rtf: string = ''
): string {
	const iframe = document.createElement('iframe');

	iframe.style.display = 'none';
	document.body.appendChild(iframe);

	try {
		const doc = iframe.contentDocument ?? iframe.contentWindow?.document;

		if (!doc) {
			return html;
		}

		doc.open();
		doc.write(html);
		doc.close();

		const JDS = 'jd-style';
		for (let i = 0; i < doc.styleSheets.length; i += 1) {
			try {
				const rules: CSSStyleRule[] = (doc.styleSheets[i] as any)
					.cssRules;

				for (let idx = 0; idx < rules.length; idx += 1) {
					if (!rules[idx].selectorText) {
						continue;
					}

					$$(rules[idx].selectorText, doc.body).forEach((elm) => {
						if (!attr(elm, JDS)) {
							attr(elm, JDS, attr(elm, 'style') || '');
							attr(elm, 'style', '');
						}

						attr(
							elm,
							'style',
							`${attr(elm, 'style')};${rules[idx].style.cssText}`
						);
					});
				}
			} catch (e) {}
		}

		$$(`[${JDS}]`, doc.body).forEach((elm) => {
			attr(elm, 'style', `${attr(elm, 'style')};${attr(elm, JDS)}`);
		});

		return transformWordToHtml(
			jodit,
			JElement.make(doc.body),
			removeStyles,
			rtf
		);
	} finally {
		Dom.safeRemove(iframe);
	}

	return html;
}
