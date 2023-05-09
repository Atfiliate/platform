/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './paste-code.less';
import './config';

import type { IJodit, IPlugin, IDialog, IUIForm } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { UIForm, UITextArea, UISelect, Button } from 'jodit/core/ui';
import { autobind, component, watch, debounce } from 'jodit/core/decorators';
import {
	$$,
	appendScriptAsync,
	attr,
	loadNext,
	loadNextStyle,
	refs,
	stripTags
} from 'jodit/core/helpers';
import { Jodit } from '../../index';
import { Dialog, Dom } from 'jodit/modules';

@component
export class pasteCode extends Plugin {
	/** @override */
	override requires = ['license'];

	/** @override */
	override buttons: IPlugin['buttons'] = [
		{
			name: 'pasteCode',
			group: 'clipboard'
		}
	];

	/** @override */
	protected afterInit(jodit: IJodit): void {
		jodit.registerCommand('pasteCode', () => this.openCodeEditDialog());
	}

	@autobind
	private openCodeEditDialog(
		defLanguage?: string,
		defValue?: string,
		pre?: HTMLElement
	): void {
		const jodit = this.j;

		const form = this.createForm(),
			{ code, language } = refs<HTMLInputElement>(form);

		if (defLanguage) {
			language.value = defLanguage;
		}

		if (defValue) {
			code.value = defValue;
		}

		jodit.async.requestIdleCallback(() => {
			code.focus();
		});

		jodit.s.save();

		const dialog = this.createDialog(
			() => {
				if (form.validate()) {
					jodit.s.restore();

					const newPre = jodit.createInside.fromHTML(
						jodit.o.pasteCode.insertTemplate(
							jodit,
							language.value,
							code.value
						)
					);

					if (pre) {
						Dom.replace(
							pre,
							newPre,
							jodit.createInside,
							false,
							true
						);
					} else {
						const current = jodit.s.current(),
							block = Dom.up(current, Dom.isBlock, jodit.editor);

						block
							? Dom.after(block, newPre)
							: jodit.s.insertNode(newPre);
					}

					this.onChange();
					return;
				}

				return false;
			},
			() => {
				jodit.s.restore();
			}
		);

		dialog.setContent(form.container).open(true);
	}

	/** @override */
	protected beforeDestruct(jodit: IJodit): void {}

	private createForm(): IUIForm {
		const { jodit } = this;

		return new UIForm(
			jodit,
			[
				new UISelect(jodit, {
					name: 'language',
					label: 'Language',
					value: jodit.o.pasteCode.defaultLanguage,
					options: jodit.o.pasteCode.languages,
					required: true
				}),
				new UITextArea(jodit, {
					label: 'Code view',
					resizable: false,
					name: 'code',
					required: true,
					className: 'jodit-paste-code__textarea'
				})
			],
			{
				className: 'jodit-paste-code'
			}
		);
	}

	private createDialog(onSave: () => void, onCancel: () => void): IDialog {
		const dialog = new Dialog({
			language: this.j.o.language
		});

		dialog
			.setHeader('Insert/Edit Code Sample')
			.setSize(
				this.j.o.pasteCode.dialog.width,
				this.j.o.pasteCode.dialog.height
			)
			.setFooter([
				Button(dialog, '', 'Cancel', 'default').onAction(() => {
					dialog.close();
					onCancel();
				}),
				Button(dialog, 'save', 'Save', 'primary').onAction(() => {
					dialog.close();
					onSave();
				})
			]);

		return dialog;
	}

	@watch('?:change')
	@debounce()
	protected onChange(): void {
		$$('pre', this.j.editor).forEach((pre) => {
			if (!attr(pre, 'contenteditable')) {
				attr(pre, 'contenteditable', false);
				this.highlightCode(pre);
			}
		});
	}

	private prismJSIsLoaded: boolean = false;

	private async highlightCode(pre: HTMLPreElement): Promise<void> {
		const {
			globalHighlightLib,
			highlightLib: { css, js, langUrl, highlight, isLangLoaded }
		} = this.j.o.pasteCode;

		if (!this.prismJSIsLoaded && !globalHighlightLib) {
			await Promise.all([
				loadNextStyle(this.jodit, css),
				loadNext(this.jodit, js)
			]);

			this.prismJSIsLoaded = true;
		}

		const language = this.parseLanguage(pre);

		if (!isLangLoaded(language) && !globalHighlightLib) {
			await appendScriptAsync(this.jodit, langUrl(language)).catch(
				() => null
			);
		}

		let container: HTMLElement = pre;

		if (
			pre.firstElementChild === pre.lastElementChild &&
			Dom.isTag(pre.firstElementChild, 'code')
		) {
			container = pre.firstElementChild;
		}

		container.innerHTML = highlight(container.innerText, language);
	}

	@watch(['?:dblclick', '?:editPreInPasteCode'])
	protected onPreEdit(e: MouseEvent | HTMLPreElement): void {
		const pre =
			Dom.isNode(e) && Dom.isTag(e, 'pre')
				? e
				: Dom.closest(<Node>e.target, 'pre', this.j.editor);

		if (pre) {
			const language = this.parseLanguage(pre);

			this.openCodeEditDialog(language, pre.innerText, pre);
		}
	}

	private parseLanguage(pre: HTMLPreElement): string {
		let language = null;

		const getLang = (code: HTMLElement): void =>
			code.classList.forEach((className) => {
				if (/language-/.test(className)) {
					const lng = /language-(.*)/.exec(className);
					if (lng && lng[1]) {
						language = lng[1];
					}
				}
			});

		getLang(pre);

		if (
			language == null &&
			pre.firstElementChild === pre.lastElementChild &&
			Dom.isTag(pre.firstElementChild, 'code')
		) {
			getLang(pre.firstElementChild);
		}

		return this.jodit.o.pasteCode.canonicalLanguageCode(language || 'html');
	}

	@watch('?:afterGetValueFromEditor')
	protected onAfterGetValueFromEditor(data: { value: string }): void {
		const strip = (
			_: unknown,
			pre: string,
			_1: unknown,
			endPreStart: string,
			content: string,
			endPre: string
		): string => {
			return `${pre.trim()}${endPreStart}${stripTags(
				content,
				this.j.ed,
				new Set(['br'])
			)}${endPre}`;
		};

		data.value = data.value
			// pre + code
			.replace(
				/(<pre[^>]*)contenteditable\s*=\s*(['"]?)false\2([^>]*>\s*<code[^>]*>)(.*?)(<\/code>\s*<\/pre>)/gis,
				strip
			)
			// only pre
			.replace(
				/(<pre[^>]*)contenteditable\s*=\s*(['"]?)false\2([^>]*>)(.*?)(<\/pre>)/gis,
				strip
			);
	}
}

Jodit.plugins.add('paste-code', pasteCode);
