/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IJodit } from 'jodit/types';

export interface ITranslateState {
	sourceLang: string;
	targetLang: string;
}

export interface ITranslateProviderFactory {
	(jodit: IJodit): ITranslateProvider;
}

export interface ITranslateProvider {
	translate(
		text: string,
		from: string,
		to: string
	): Promise<ITranslateResponse>;
	supportedLanguages(): Promise<ITranslateSupportedLanguages>;
}

export interface ITranslateSupportedLanguages {
	langs: {
		[title: string]: string;
	};
}

export interface ITranslateResponse {
	text: string;
}

export interface IGoogleTranslateProviderOptions {
	url: string;
	key: string;
}

export interface IGoogleTranslateResponse {
	data: {
		translations: [
			{
				translatedText: string;
			}
		];
	};
}

declare module 'jodit/types/jodit' {
	interface IJodit {
		/**
		 * Translate plugin: Translate selection CMD+SHIFT+O
		 */
		execCommand(command: 'translate'): void;

		/**
		 * Translate plugin: Open Translate options CMD+ALT+O
		 */
		execCommand(command: 'translateOptions'): void;
	}
}
