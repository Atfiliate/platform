/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './translate.less';

import type { IJodit } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Jodit } from '../../index';

import { assert } from 'jodit/core/helpers/utils/assert';
import { isFunction } from 'jodit/core/helpers/checker/is-function';
import { isString } from 'jodit/core/helpers/checker/is-string';
import { defaultLanguage as defineLanguage } from 'jodit/core/helpers/utils/default-language';
import { persistent } from 'jodit/core/decorators';

import type { ITranslateProvider, ITranslateState } from './interface';
import { GoogleTranslateProvider } from './providers/google/google';

import './config';

import { UITranslateSettings } from './ui/settings/settings';
import { Button } from 'jodit/src/core/ui/button/button/button';

export class Translate extends Plugin {
	override requires = ['license'];

	override buttons = [
		{
			name: 'translate.translate',
			group: 'insert'
		}
	];

	@persistent
	state: ITranslateState = {
		sourceLang: this.jodit.o.translate.defaultSourceLang || 'en',
		targetLang: this.jodit.o.translate.defaultTargetLang
	};

	private __getProvider(): ITranslateProvider {
		const { provider } = this.jodit.options.translate;

		if (isString(provider)) {
			switch (provider) {
				case 'google':
					return new GoogleTranslateProvider(this.j);
				default:
					throw new Error('Unknown provider');
			}
		}

		assert(isFunction(provider), 'Provider must be a function');

		return provider(this.jodit);
	}

	protected afterInit(jodit: IJodit): void {
		const defaultLanguage = defineLanguage(
				jodit.o.language,
				Jodit.defaultOptions.language
			),
			language = defineLanguage(jodit.o.language, defaultLanguage);

		const provider = this.__getProvider();

		jodit
			.registerCommand('translateOptions', {
				exec: async () => {
					let newState: ITranslateState = this.state;

					const dlg = jodit.dlg();

					dlg.setHeader('Translate options');

					const langs = await provider.supportedLanguages();
					const settings = new UITranslateSettings(dlg, this.state, {
						sourceList: langs.langs,
						targetList: langs.langs,
						onChange(state): void {
							newState = state;
						}
					});
					dlg.setContent(settings);
					dlg.setFooter([
						Button(jodit, 'cancel', 'Cancel').onAction(() =>
							dlg.close()
						),
						Button(jodit, 'ok', 'Save', 'primary').onAction(() => {
							this.state = newState;
							dlg.close();
						})
					]);

					settings.bindDestruct(dlg);

					dlg.setSize(500, 400).open(true);
				},
				hotkeys: jodit.o.translate.hotkeys.translateOptions
			})

			.registerCommand('translate', {
				exec: () => {
					const selection = jodit.s.html;
					if (!selection) {
						jodit.message.error('Select text for translate');
						return;
					}

					return provider
						.translate(
							selection,
							!this.state.sourceLang ||
								this.state.sourceLang === 'auto'
								? language
								: this.state.sourceLang,
							this.state.targetLang
						)
						.then((response) => {
							const range = jodit.s.range;
							range.deleteContents();
							jodit.s.insertNode(
								jodit.createInside.text(response.text)
							);
						})
						.catch((error) => {
							jodit.message.error(
								isString(error) ? error : error.message
							);
						});
				},
				hotkeys: jodit.o.translate.hotkeys.translateSelection
			});
	}

	protected beforeDestruct(jodit: IJodit): void {}
}

Jodit.plugins.add('translate', Translate);
