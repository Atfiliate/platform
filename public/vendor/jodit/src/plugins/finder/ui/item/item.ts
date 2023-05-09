/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './item.less';

import type {
	CanUndef,
	IFileBrowserItemElement,
	IFileBrowserItemWrapper,
	IViewBased
} from 'jodit/types';
import { UIElement } from 'jodit/core/ui';
import { component, watch } from 'jodit/core/decorators';
import { FileBrowserItem } from 'jodit/modules/file-browser/builders/item';
import { Dom } from 'jodit/modules';
import { attr, css, ctrlKey } from 'jodit/core/helpers';
import { assert } from 'jodit/src/core/helpers';

@component
export class UIBrowserItem extends UIElement {
	item: IFileBrowserItemWrapper;

	/** @override */
	className(): string {
		return 'UIBrowserItem';
	}

	constructor(jodit: IViewBased, item: IFileBrowserItemElement) {
		super(jodit);
		this.item = FileBrowserItem.create(item);

		jodit.e.on(
			this.container,
			'click contextmenu dblclick',
			(e: MouseEvent): false => {
				jodit.e.fire(
					e.type + 'Item.filebrowser',
					this.item,
					ctrlKey(e) || e.shiftKey,
					e
				);

				return false;
			}
		);
	}

	/** @override */
	protected override render(): string {
		return `<div tabindex='-1'>
			<div class='&__image'></div>
			<div class='&__info'></div>
			<div class='&__heart'>*heart*</div>
		</div>`;
	}

	@watch('heart:click')
	protected onClickFavorite(): false {
		this.bubble((box) => {
			this.jodit.e.fire(box, 'toggleFavoriteItem', this.item);
		});

		return false;
	}

	@watch(['container:click', 'container:contextmenu', 'container:dblclick'])
	protected onAction(e: MouseEvent): false {
		this.jodit.e.fire(
			e.type + 'Item.filebrowser',
			this.item,
			ctrlKey(e) || e.shiftKey,
			e
		);

		return false;
	}

	/** @override */
	override update(): void {
		const image = this.getElm('image');
		assert(image != null, 'image element does not exists');
		css(image, 'backgroundImage', `url(${encodeURI(this.item.imageURL)})`);

		const { type, file, time, size } = this.item;
		this.setMod('is-file', this.item.isImage === false)
			.setMod('type', type ?? 'file')
			.setElementValue('name', file)
			.setElementValue('time', time)
			.setElementValue('filesize', size);

		attr(
			this.container,
			'title',
			type !== 'folder' ? `${file} ${time} ${size}` : file
		);

		super.update();
	}

	/**
	 * Create element and set value
	 */
	setElementValue(name: string, value: CanUndef<string>): this {
		const elementClassName = this.getFullElName(name);

		let element = this.getElm(name);

		if (!value) {
			element && Dom.safeRemove(element);
			return this;
		}

		if (!element) {
			const wrapper = this.getElm('info');
			assert(wrapper != null, 'wrapper element does not exist');
			element = this.j.create.div(elementClassName);
			wrapper.appendChild(element);
		}

		element.innerText = value;

		return this;
	}
}
