/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './header.less';

import type { ButtonsOption } from 'jodit/types';
import type { IFileBrowserPro, IFileBrowserOptionsPro } from '../../interface';
import type { StateManager } from '../../helpers/state-manager';
import { UIGroup, UIInput } from 'jodit/core/ui';
import { component } from 'jodit/core/decorators';
import { makeCollection } from 'jodit/modules/toolbar/factory';
import { isString } from 'jodit/core/helpers/checker/is-string';

@component
export class UIBrowserHeader extends UIGroup<IFileBrowserPro> {
	/** @override */
	override syncMod: boolean = true;

	private toolbar = makeCollection(this.j);

	private filter = new UIInput(this.j, {
		icon: 'search',
		placeholder: 'Filter',
		clearButton: true,
		onChange: (value: string): void => {
			this.stateManager.setFilter(value);
		}
	});

	/** @override */
	override className(): string {
		return 'UIBrowserHeader';
	}

	constructor(
		jodit: IFileBrowserPro,
		override readonly options: IFileBrowserOptionsPro,
		readonly stateManager: StateManager
	) {
		super(jodit);

		this.append(this.toolbar).append(this.filter);

		this.filter.container.classList.add(this.getFullElName('filter'));

		this.toolbar.setMod('mode', 'header').build(this.__getButtons());
	}

	private __getButtons(): ButtonsOption {
		const options = (this.options.toolbarButtons ?? []) as Exclude<
			ButtonsOption,
			string
		>;

		return options.filter((btn): boolean => {
			if (!isString(btn)) {
				return true;
			}

			switch (btn) {
				case 'filebrowser.edit':
					return (
						this.j.dataProvider.canI('ImageResize') ||
						this.j.dataProvider.canI('ImageCrop')
					);
				case 'filebrowser.new-folder':
					return this.j.dataProvider.canI('FolderCreate');
				case 'filebrowser.upload':
					return this.j.dataProvider.canI('FileUpload');
				case 'filebrowser.remove':
					return this.j.dataProvider.canI('FileRemove');
			}

			return true;
		});
	}
}
