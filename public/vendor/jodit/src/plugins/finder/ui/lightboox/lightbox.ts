/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './lightbox.less';

import type { IFileBrowserItemWrapper } from 'jodit/types';
import { Dialog, Dom, UIElement } from 'jodit/modules';
import { component, watch, autobind } from 'jodit/core/decorators';
import { css, loadImage } from 'jodit/core/helpers';
import type { IFileBrowserPro } from '../../interface';
import { KEY_LEFT, KEY_RIGHT, KEY_SPACE } from 'jodit/core/constants';
import { assert } from 'jodit/src/core/helpers';

@component
export class UILightBox extends UIElement<IFileBrowserPro> {
	/** @override */
	override className(): string {
		return 'UILightBox';
	}

	private dialog: Dialog = new Dialog();

	protected override render(): string {
		return `<div>
			<div class='&__previous'>*angle-left*</div>
			<div class='&__preview'></div>
			<div class='&__loader'></div>
			<div class='&__next'>*angle-right*</div>
		</div>`;
	}

	constructor(
		jodit: IFileBrowserPro,
		protected current: IFileBrowserItemWrapper,
		protected elements: IFileBrowserItemWrapper[]
	) {
		super(jodit);

		const { dialog } = this;

		dialog
			.setMod('theme', jodit.state.theme)
			.toolbar.setMod('mode', 'header');

		dialog.open(this);

		this.elements = this.elements.filter((e) => e.isImage);

		dialog.e.on(dialog, 'afterClose', () => {
			this.destruct();
		});

		this.addGlobalListeners();
		this.onChangeCurrent();

		dialog.toolbar.build([
			{
				icon: 'check',
				exec: (): void => {
					jodit.stateManager.addActive(this.current, false);
					jodit.e.fire('select.filebrowser');
					dialog.close();
				}
			},
			'dialog.close'
		]);
	}

	@watch('current')
	protected async onChangeCurrent(): Promise<void> {
		const { current } = this;
		this.setMod('loading', true);

		const preview = this.getElm('preview');

		assert(preview != null, 'preview element does not exist');

		Dom.detach(preview);
		css(preview, {
			backgroundImage: null
		});

		if (current.isImage) {
			const image = await loadImage(current.fileURL, this.j);
			this.dialog.setPosition();

			css(preview, {
				width: Math.min(this.jodit.ow.innerWidth, image.naturalWidth),
				height: Math.min(
					this.jodit.ow.innerHeight - 100,
					image.naturalHeight
				),
				backgroundImage: `url(${image.src})`
			});
		} else {
			const iframe = await this.makeIframe(current.fileURL);
			preview.appendChild(iframe);
		}

		this.dialog.setSize();
		this.dialog.setPosition();
		this.setMod('loading', false);
	}

	private makeIframe(url: string): HTMLIFrameElement {
		const iframe = this.j.c.element('iframe');
		iframe.classList.add(this.getFullElName('office-iframe'));
		iframe.src = /\.pdf/.test(url)
			? url
			: this.j.o.previewOfficeURL + encodeURIComponent(url);

		return iframe;
	}

	@watch('previous:click')
	protected onPreviousClick(): void {
		const { current } = this;
		let index = this.j.stateManager.getIndex(current, this.elements);

		if (index <= 0) {
			index = this.elements.length - 1;
		} else {
			index -= 1;
		}

		this.current = this.elements[index];
	}

	@watch('next:click')
	protected onNextClick(): void {
		const { current } = this;
		let index = this.j.stateManager.getIndex(current, this.elements);

		if (index >= this.elements.length - 1) {
			index = 0;
		} else {
			index += 1;
		}

		this.current = this.elements[index];
	}

	static open(
		jodit: IFileBrowserPro,
		current: IFileBrowserItemWrapper,
		elements: IFileBrowserItemWrapper[]
	): UILightBox {
		return new UILightBox(jodit, current, elements);
	}

	private addGlobalListeners(): void {
		this.j.e.on(this.j.od, 'keydown', this.onKeyPress);
	}

	@autobind
	private onKeyPress(e: KeyboardEvent): void | false {
		if (e.key === KEY_LEFT || e.key === KEY_RIGHT || e.key === KEY_SPACE) {
			e.key === KEY_LEFT ? this.onPreviousClick() : this.onNextClick();
			return false;
		}
	}

	private removeGlobalListeners(): void {
		this.j.e.off(this.j.od, 'keydown', this.onKeyPress);
	}

	override destruct(): any {
		this.removeGlobalListeners();
		this.dialog.destruct();
		return super.destruct();
	}
}
