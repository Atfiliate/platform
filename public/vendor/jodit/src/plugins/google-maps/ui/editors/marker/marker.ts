/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IMarkerState } from '../../../interface';
import { component, hook } from 'jodit/core/decorators';
import { UIWysiwyg } from '../../wysiwyg/wysiwyg';
import { UIBaseEditor } from '../base';

@component
export class UIMarkerEditor extends UIBaseEditor<IMarkerState> {
	@hook('ready')
	protected override onReady(): void {
		super.onReady();

		const editor = new UIWysiwyg(
			this.j,
			this.options.googleMaps.inlineEditorOptions,
			this.state.text ?? '',
			(value) => this.j.e.fire(this, 'change', 'text', value)
		);

		this.append(editor, 'form');
	}
}
