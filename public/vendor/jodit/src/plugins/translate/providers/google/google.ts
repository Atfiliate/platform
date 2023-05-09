/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import { assert } from 'jodit/src/core/helpers/utils';
import type { IJodit } from 'jodit/types';
import type {
	IGoogleTranslateResponse,
	ITranslateProvider,
	ITranslateResponse,
	ITranslateSupportedLanguages
} from '../../interface';
import { languages } from '../languages';

export class GoogleTranslateProvider implements ITranslateProvider {
	constructor(readonly jodit: IJodit) {}

	private __fetch(
		command: 'translate',
		data: {
			q: string;
			source: string;
			target: string;
			format: 'html';
		}
	): Promise<IGoogleTranslateResponse>;
	private __fetch(command: string, data: object = {}): Promise<any> {
		const opt = this.jodit.o.translate.googleProviderOptions;

		assert(opt, 'Set googleProviderOptions');

		return this.jodit
			.fetch(opt.url + '?key=' + opt.key, {
				method: 'POST',
				data: {
					...data,
					ui: this.jodit.o.language
				},
				contentType: 'application/json; charset=utf-8',
				withCredentials: false
			})
			.then((resp) => resp.json())
			.catch((resp) => {
				try {
					this.jodit.message.error(resp.json().message);
				} catch (e) {
					// @ts-ignore
					if (!isProd) {
						console.error(e);
					}
				}
			});
	}

	translate(
		q: string,
		source: string,
		target: string
	): Promise<ITranslateResponse> {
		return this.__fetch('translate', {
			q,
			source,
			target,
			format: 'html'
		}).then((resp) => {
			return { text: resp.data.translations[0].translatedText };
		});
	}

	supportedLanguages(): Promise<ITranslateSupportedLanguages> {
		return Promise.resolve({
			langs: languages
		});
	}
}
