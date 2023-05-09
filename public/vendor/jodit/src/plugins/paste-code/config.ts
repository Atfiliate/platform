/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import { Config } from 'jodit/config';
import type { IUIOption, IJodit } from 'jodit/types';
import { htmlspecialchars } from 'jodit/core/helpers';

Config.prototype.controls.pasteCode = {
	icon: require('./icon.svg'),
	tooltip: 'Paste code',
	command: 'pasteCode'
};

declare global {
	const Prism: {
		languages: {
			[key: string]: Function;
		};
		highlight: (code: string, parser: any, language: string) => string;
	};
}

declare module 'jodit/config' {
	interface Config {
		pasteCode: {
			globalHighlightLib: boolean;

			canonicalLanguageCode: (lang: string) => string;

			highlightLib: {
				highlight: (code: string, language: string) => string;
				isLangLoaded: (lang: string) => boolean;
				langUrl: (lang: string) => string;
				js: string[];
				css: string[];
			};

			defaultLanguage: string;

			languages: IUIOption[];

			insertTemplate: (
				jodit: IJodit,
				language: string,
				value: string
			) => string;

			dialog: {
				width: number;
				height: number;
			};
		};
	}
}

Config.prototype.pasteCode = {
	globalHighlightLib: false,

	canonicalLanguageCode(lang: string): string {
		switch (lang) {
			case 'ts':
				return 'typescript';

			case 'js':
				return 'javascript';

			case 'markup':
				return 'html';
		}
		return lang;
	},

	highlightLib: {
		highlight(code: string, language: string): string {
			return Prism.highlight(
				code,
				Prism.languages[language] || Prism.languages.plain,
				language
			);
		},

		isLangLoaded(lang: string): boolean {
			return Boolean(Prism.languages[lang]);
		},

		js: [
			'https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/prism.min.js'
		],

		langUrl: (lang: string): string =>
			`https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/components/prism-${lang}.min.js`,

		css: [
			'https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/themes/prism.min.css'
		]
	},

	defaultLanguage: 'html',

	insertTemplate: (jodit: IJodit, language: string, value: string): string =>
		`<pre class="language-${language}">${htmlspecialchars(value)}</pre>`,

	languages: [
		{ value: 'html', text: 'HTML/XML' },
		{ value: 'plaintext', text: 'Plain' },
		{ value: 'bash', text: 'Bash' },
		{ value: 'javascript', text: 'JavaScript' },
		{ value: 'css', text: 'CSS' },
		{ value: 'php', text: 'PHP' },
		{ value: 'ruby', text: 'Ruby' },
		{ value: 'python', text: 'Python' },
		{ value: 'java', text: 'Java' },
		{ value: 'c', text: 'C' },
		{ value: 'csharp', text: 'C#' },
		{ value: 'cpp', text: 'C++' }
	],

	dialog: {
		width: 700,
		height: 600
	}
};
