/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './iframe-editor.less';

import type { IframeEditorState } from '../../interface';
import { UIBlock, UICheckbox, UIGroup, UIInput } from 'jodit/core/ui';
import { component } from 'jodit/core/decorators';

@component
export class UIIframeEditor extends UIGroup {
	override className(): string {
		return 'UIIframeEditor';
	}

	readonly state: IframeEditorState = {
		src: '',
		className: '',
		width: 400,
		height: 200,
		frameBorder: false,
		enableScrollbars: false,
		name: '',
		title: ''
	};

	readonly srcField: UIInput;

	constructor(jodit: UIGroup['jodit'], opt: Partial<IframeEditorState>) {
		super(jodit);
		Object.assign(this.state, opt);

		this.srcField = new UIInput(jodit, {
			label: 'URL',
			type: 'url',
			required: true,
			value: this.state.src,
			onChange: (src): void => {
				this.state.src = src;
			}
		});

		this.append([
			this.srcField,

			new UIBlock(
				jodit,
				[
					new UIInput(jodit, {
						label: 'Width',
						type: 'number',
						value: this.state.width,
						onChange: (v): void => {
							this.state.width = parseInt(v, 10) || 0;
						}
					}),

					new UIInput(jodit, {
						label: 'Height',
						type: 'number',
						value: this.state.height,
						onChange: (v): void => {
							this.state.height = parseInt(v, 10) || 0;
						}
					})
				],
				{
					// @ts-ignore
					className: this.getFullElName('block'),
					align: 'center'
				}
			),

			new UIBlock(jodit, [
				new UICheckbox(jodit, {
					label: 'Show frame border',
					checked: Boolean(opt.frameBorder),
					onChange: (value): void => {
						this.state.frameBorder = value === 'true';
					}
				})
			]),

			new UIInput(jodit, {
				label: 'Name',
				value: this.state.name,
				type: 'text',
				onChange: (v): void => {
					this.state.name = v;
				}
			}),

			new UIInput(jodit, {
				label: 'Title',
				value: this.state.title,
				type: 'text',
				onChange: (v): void => {
					this.state.title = v;
				}
			})
		]);
	}
}
