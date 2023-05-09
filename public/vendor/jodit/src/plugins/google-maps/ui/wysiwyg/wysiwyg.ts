/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './wysiwyg.less';

import type { IJodit } from 'jodit/types';
import { Jodit } from '../../../../';
import { UIElement } from 'jodit/core/ui';
import { component } from 'jodit/core/decorators';
import { assert } from 'jodit/core/helpers';

@component
export class UIWysiwyg extends UIElement {
	className(): string {
		return 'UIWysiwyg';
	}

	constructor(
		jodit: UIElement['jodit'],
		options: Partial<IJodit['options']>,
		value: string,
		onChange: (value: string) => void
	) {
		super(jodit);

		const wysiwyg = this.getElm('editor');
		assert(wysiwyg != null, 'editor element does not exist');
		const editor = Jodit.make(wysiwyg, {
			buttons: ['bold', 'italic', 'image'],
			height: 100,
			minHeight: 100,
			allowResizeY: false,
			allowResizeX: false,
			disablePlugins: [
				'mobile',
				'backup',
				'highlight-signature',
				'tune-block',
				'show-blocks'
			],
			toolbarButtonSize: 'small',
			language: jodit.o.language,
			direction: jodit.o.direction,
			theme: jodit.o.theme,
			statusbar: false,
			...options
		});

		editor.value = value;

		editor.e.on('change', () => onChange(editor.value));
	}

	protected override render(): string {
		return `<div>
			<div class='&__label'>~Info~</div>
			<div class='&__editor'></div>
		</div>`;
	}
}
