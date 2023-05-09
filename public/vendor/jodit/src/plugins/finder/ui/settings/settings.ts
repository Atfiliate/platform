/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './settings.less';

import type { IViewBased, ModType } from 'jodit/types';
import type { IFileBrowserStatePro } from '../../interface';
import { Icon, UIButtonGroup, UIGroup, UISelect } from 'jodit/core/ui';
import { component, watch } from 'jodit/core/decorators';
import { assert } from 'jodit/src/core/helpers';

@component
export class UIBrowserSettings extends UIGroup {
	/** @override */
	override className(): string {
		return 'UIBrowserSettings';
	}

	/** @override */
	protected override render(): string {
		return `<div>
			<div class="${this.getFullElName('close')}">${Icon.get('cancel')}</div>
			<div class="${this.getFullElName('title')}">${this.j.i18n('Settings')}</div>
			<div class="${this.getFullElName('options')}"></div>
		</div>`;
	}

	/** @override */
	protected override appendChildToContainer(
		childContainer: HTMLElement
	): void {
		const options = this.getElm('options');
		assert(options != null, 'options element does not exists');
		options.appendChild(childContainer);
	}

	override afterSetMod(name: string, value: ModType): void {
		if (name === 'hidden' && value === false) {
			this.generateSettings();
		}

		super.afterSetMod(name, value);
	}

	constructor(jodit: IViewBased, readonly state: IFileBrowserStatePro) {
		super(jodit);

		const close = this.getElm('close');
		assert(close != null, 'close element does not exists');

		jodit.e.on(close, 'click', () => {
			this.state.showSettings = false;
		});
	}

	@watch('state.view')
	protected onChangeView(): void {
		const tileSize = this.getElm('tile-size');

		if (tileSize) {
			tileSize.style.display =
				this.state.view === 'tiles' ? 'block' : 'none';
		}
	}

	/**
	 * Generate options list
	 */
	private generateSettings(): void {
		this.clear();

		const { j } = this;

		this.append([
			new UIButtonGroup(j, {
				label: 'Theme',
				name: 'theme',
				value: this.state.theme,
				radio: true,
				options: [
					{ value: 'default', text: 'Light' },
					{ value: 'dark', text: 'Dark' }
				],
				onChange: (values): void => {
					if (
						this.state.theme !== 'default' &&
						this.state.theme !== 'dark'
					) {
						this.state.theme = 'default';
						return;
					}

					this.state.theme = values[0].value as string;
				}
			}),

			new UIButtonGroup(j, {
				label: 'Show favorites',
				name: 'showFavorites',
				value: this.state.showFavorites,
				radio: true,
				options: [
					{ value: true, text: 'Show' },
					{ value: false, text: 'Hide' }
				],
				onChange: (values): void => {
					this.state.showFavorites = values[0].value as boolean;
				}
			}),

			new UIButtonGroup(j, {
				label: 'View',
				name: 'view',
				value: this.state.view,
				radio: true,
				options: [
					{ value: 'tiles', text: 'Tiles' },
					{ value: 'list', text: 'List' },
					{ value: 'compact', text: 'Compact' }
				],
				onChange: (values): void => {
					this.state.view = values[0].value as 'tiles';
				}
			}),

			new UIButtonGroup(j, {
				label: 'Folders position',
				name: 'foldersPosition',
				value: this.state.foldersPosition,
				radio: true,
				options: [
					{ value: 'top', text: 'Top' },
					{ value: 'bottom', text: 'Bottom' },
					{ value: 'default', text: 'Default' }
				],
				onChange: (values): void => {
					this.state.foldersPosition = values[0].value as 'top';
				}
			}),

			new UISelect(j, {
				label: 'Sort by',
				name: 'sort-by',
				value: this.state.sortBy,
				options: [
					{
						value: 'changed-asc',
						text: j.i18n('Sort by changed') + '(⬆)'
					},
					{
						value: 'changed-desc',
						text: j.i18n('Sort by changed') + '(⬇)'
					},
					{
						value: 'name-asc',
						text: j.i18n('Sort by name') + '(⬆)'
					},
					{
						value: 'name-desc',
						text: j.i18n('Sort by name') + '(⬇)'
					},
					{
						value: 'size-asc',
						text: j.i18n('Sort by size') + '(⬆)'
					},
					{
						value: 'size-desc',
						text: j.i18n('Sort by size') + '(⬇)'
					}
				],
				onChange: (value: string): void => {
					this.state.sortBy = value;
				}
			}),

			new UISelect(j, {
				label: 'Tile size',
				name: 'tile-size',
				value: this.state.tileSize,
				options: [
					{
						value: 'xsmall',
						text: 'Extra small'
					},
					{
						value: 'small',
						text: 'Small'
					},
					{
						value: 'default',
						text: 'Default'
					},
					{
						value: 'large',
						text: 'Large'
					},
					{
						value: 'xlarge',
						text: 'Extra large'
					}
				],
				onChange: (value: string): void => {
					this.state.tileSize =
						value as IFileBrowserStatePro['tileSize'];
				}
			})
		]);

		this.onChangeView();
	}
}
