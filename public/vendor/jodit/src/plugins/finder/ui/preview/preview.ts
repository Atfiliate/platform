/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import './preview.less';

import type { ModType, Nullable, RejectablePromise } from 'jodit/types';
import type { IFileBrowserStatePro } from '../../interface';
import { UIGroup } from 'jodit/core/ui';
import { component, debounce, hook, watch } from 'jodit/core/decorators';
import { UIResize } from '../../../../traits/resize/resize';
import { css, loadImage } from 'jodit/core/helpers';
import { Dom } from 'jodit/core/dom';
import { UIBrowserItem } from '../item/item';
import { assert } from 'jodit/src/core/helpers';

@component
export class UIPreview extends UIGroup implements UIResize {
	/** @override */
	override className(): string {
		return 'UIPreview';
	}

	/**
	 * Add handle resizer
	 */
	@hook('ready')
	@watch(':resize', window)
	@debounce()
	addResize(): void {
		UIResize.remove(this);
		UIResize.install(this, screen.width > 450 ? 'left' : 'top');
	}

	/** @override */
	override render(): string {
		return `<div>
				<div class="&__image"></div>
				<div class="&__info"></div>
				<div class="&__loader"></div>
				<div class="&__empty-message">~Select image~</div>
			</div>`;
	}

	constructor(
		jodit: UIPreview['jodit'],
		protected readonly state: IFileBrowserStatePro
	) {
		super(jodit);
		this.onChangeMetaInfo();
	}

	override afterSetMod(name: string, value: ModType): void {
		if (name === 'hidden' && value === false) {
			this.onChangeMetaInfo();
		}

		super.afterSetMod(name, value);
	}

	private lastLoadPromise: Nullable<RejectablePromise<any>> = null;

	@watch('state.metaInfo')
	private onChangeMetaInfo(): void {
		if (this.getMod('hidden')) {
			return;
		}

		const { metaInfo } = this.state;

		this.setMod('empty', !metaInfo);

		const info = this.getElm('info');
		assert(info != null, 'info element does not exists');
		Dom.detach(info);

		const image = this.getElm('image');
		assert(image != null, 'image element does not exists');
		css(image, {
			backgroundImage: null
		});

		if (!metaInfo) {
			return;
		}

		this.setMod('is-file', metaInfo.isImage === false).setMod(
			'type',
			metaInfo.type ?? 'file'
		);

		UIBrowserItem.prototype.setElementValue.call(
			this,
			'name',
			metaInfo.file
		);
		UIBrowserItem.prototype.setElementValue.call(
			this,
			'time',
			metaInfo.time
		);
		UIBrowserItem.prototype.setElementValue.call(
			this,
			'filesize',
			metaInfo.size
		);

		this.setMod('loading', true);
		this.lastLoadPromise?.rejectCallback();

		this.lastLoadPromise = loadImage(
			metaInfo.isImage ? metaInfo.fileURL : metaInfo.imageURL,
			this.j
		);

		this.lastLoadPromise
			.then((image) => {
				const elm = this.getElm('image');

				assert(elm != null, 'image element does not exist');

				image &&
					css(elm, {
						backgroundImage: `url(${image.src})`
					});
			})
			.finally(() => {
				this.setMod('loading', false);
			})
			.catch(() => {});
	}
}
