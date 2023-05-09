/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './button-generator.less';

import type { CanUndef, IDictionary } from 'jodit/types';

import { UIElement, UIGroup } from 'jodit/core/ui';
import { component, autobind } from 'jodit/core/decorators';
import { UIPreviewButtonGenerator } from '../preview/preview';
import { UIGButton } from '../button/button';
import { UIFormButtonGenerator } from '../form/form';
import { assert } from 'jodit/src/core/helpers';

const styles = require('../../assets/styles.json');

@component
export class UIButtonGenerator extends UIElement {
	/** @override */
	override className(): string {
		return 'UIButtonGenerator';
	}

	state: IDictionary = {
		text: '',
		className: '',
		href: '',

		bgEnd: '#5cbf2a',
		bgStart: '#44c767',

		borderColor: '#18ab29',
		borderRadius: 28,
		borderSize: 1,

		boxShadow: false,
		boxShadowBlurRadius: 0,
		boxShadowColor: '#3dc21b',
		boxShadowInset: false,
		boxShadowOffsetX: 0,
		boxShadowOffsetY: 0,
		boxShadowSpreadRadius: 0,

		fontColor: '#fff',
		fontFamily: 'Arial',
		fontSize: 17,
		fontStyle: false,
		fontWeight: false,
		fontItalic: false,

		paddingX: 31,
		paddingY: 16,

		previewBgColor: '#f5f5f5',

		solid: true,

		textShadow: true,
		textShadowBlurRadius: 0,
		textShadowColor: '#2f6627',
		textShadowOffsetX: 0,
		textShadowOffsetY: 1
	};

	private preview = new UIPreviewButtonGenerator(
		this.j,
		this.state,
		this.updateState
	);
	private form = new UIFormButtonGenerator(
		this.j,
		this.state,
		this.updateState
	);

	override render(): string {
		return `<div>
			<div class='&__generator'>
				<div class='&__preview'></div>
				<div class='&__form'></div>
			</div>
			<div class='&__library'></div>
		</div>`;
	}

	constructor(jodit: UIElement['jodit']) {
		super(jodit);
		this.generateLibrary();
		const preview = this.getElm('preview');
		assert(preview != null, 'preview element does not exists');
		preview.appendChild(this.preview.container);

		const form = this.getElm('form');
		assert(form != null, 'form element does not exists');
		form.appendChild(this.form.container);
	}

	target: CanUndef<HTMLElement>;

	private generateLibrary(): void {
		const group = new UIGroup(this.j);

		styles.map(UIButtonGenerator.mapKey).forEach((style: IDictionary) => {
			const button = new UIGButton(this.j, style);
			button.setMod('mode', 'library');
			group.append(button);

			this.j.e.on(button.container, 'click', () => {
				const { text } = this.state;

				Object.assign(this.state, style);
				Object.assign(this.state, {
					className: '',
					text
				});

				this.update();
			});
		});

		const library = this.getElm('library');
		assert(library != null, 'library element does not exists');
		library.appendChild(group.container);
	}

	static mapKey(o: IDictionary): IDictionary {
		return {
			bgEnd: o.be,
			bgStart: o.bs,

			borderColor: o.bc,
			borderRadius: o.br,
			borderSize: o.bse,

			boxShadow: o.bsh,
			boxShadowBlurRadius: o.bsbr,
			boxShadowColor: o.bsc,
			boxShadowInset: o.bsi,
			boxShadowOffsetX: o.bsox,
			boxShadowOffsetY: o.bsoy,
			boxShadowSpreadRadius: o.bssr,

			fontColor: o.fc,
			fontFamily: o.ff,
			fontSize: o.fs,
			fontStyle: o.fse,
			fontWeight: o.fw,

			paddingX: o.px,
			paddingY: o.py,

			previewBgColor: o.pbc,

			solid: o.s,

			text: o.t,
			textShadow: o.ts,
			textShadowBlurRadius: o.tsbr,
			textShadowColor: o.tsc,
			textShadowOffsetX: o.tsox,
			textShadowOffsetY: o.tsoy
		};
	}

	@autobind
	private updateState(name: string, value: boolean | string | number): void {
		this.state[name] = value;
		this.update();
	}

	override update(): void {
		if (this.isReady) {
			this.form.update();
			this.preview.update();
		}
	}
}
