/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './panel.less';

import type { IFileBrowserItemWrapper } from 'jodit/types';
import type {
	IFileBrowserTreeItemPro,
	IFileBrowserStatePro,
	IFileBrowserPro
} from '../../interface';
import type { StateManager } from '../../helpers/state-manager';
import { UIGroup } from 'jodit/core/ui';
import { UIVirtualScroll } from '../virtual-scroll/virtual-scroll';
import { component, watch } from 'jodit/core/decorators';
import { UISidebar } from '../sidebar/sidebar';
import { UIBrowserSettings } from '../settings/settings';
import { css, isNumber, scrollIntoViewIfNeeded } from 'jodit/core/helpers';
import { UIBrowserSources } from '../sources/sources';
import { UIBrowserStatusBar } from '../statusbar/statusbar';
import { UIPreview } from '../preview/preview';

@component
export class UIBrowserPanel extends UIGroup<IFileBrowserPro> {
	/** @override */
	override syncMod: boolean = true;

	/** @override */
	override className(): string {
		return 'UIBrowserPanel';
	}

	readonly state!: IFileBrowserStatePro;

	protected sources = new UIBrowserSources(this.j);

	protected sidebar = new UISidebar(
		this.jodit,
		[this.sources],
		this.stateManager.state
	);

	protected preview = new UIPreview(this.jodit, this.stateManager.state);

	protected statusbar = new UIBrowserStatusBar(this.j);

	items = new UIVirtualScroll(this.j, this.stateManager);

	protected settings = new UIBrowserSettings(
		this.jodit,
		this.stateManager.state
	);

	/**
	 * Count elements in one row for calculate navigation
	 */
	get countInRow(): number {
		if (this.state.view === 'list') {
			return 1;
		}

		if (!this.items.elements.length) {
			return 1;
		}

		const { container } = this.items.elements[0],
			margin = css(container, 'marginLeft');

		return Math.floor(
			this.items.container.offsetWidth /
				(container.offsetWidth + (isNumber(margin) ? margin : 0))
		);
	}

	/**
	 * Count elements in one column for calculate navigation
	 */
	get countInColumn(): number {
		if (!this.items.elements.length) {
			return 1;
		}

		const { container } = this.items.elements[0],
			margin = css(container, 'marginTop');

		return Math.floor(
			this.items.container.offsetHeight /
				(container.offsetHeight + (isNumber(margin) ? margin : 0))
		);
	}

	/** @override */
	protected override render(): string {
		return `<div>
			<div class='&__content'></div>
			<div class='&__footer'></div>
		</div>`;
	}

	constructor(jodit: IFileBrowserPro, readonly stateManager: StateManager) {
		super(jodit);

		this.state = stateManager.state;

		this.append(this.sidebar, 'content');
		this.append(this.items, 'content');
		this.append(this.settings, 'content');
		this.append(this.preview, 'content');
		this.append(this.statusbar, 'footer');

		this.onChangeElements();
		this.onChangeSources();
		this.onChangeView();
		this.onChangeTileSize();
		this.onChangeShowFavorites();
		this.onChangeActiveElements();
		this.onChangeFavorites();
		this.onChangeShowSideBar();
		this.onChangeShowSettings();
		this.onChangeShowPreview();
		this.onChangeTheme();
	}

	@watch('state.theme')
	private onChangeTheme(): void {
		this.setMod('theme', this.stateManager.state.theme);
	}

	@watch('state.elements')
	private onChangeElements(): void {
		this.items.build(this.stateManager.state.elements);
	}

	@watch('state.activeElements')
	private onChangeActiveElements(): void {
		if (!this.state.activeElements.length) {
			this.state.info = '';
			this.state.metaInfo = null;
		}

		this.items.elements.forEach((elm) => {
			elm.setMod('active', Boolean(this.stateManager.isActive(elm.item)));
		});

		this.j.e.fire('changeSelection');
	}

	@watch(['state.favorites', 'state.elements'])
	private onChangeFavorites(): void {
		this.items.elements.forEach((elm) => {
			elm.setMod(
				'favorite',
				Boolean(this.stateManager.isFavorite(elm.item))
			);
		});
	}

	@watch('state.sources')
	private onChangeSources(): void {
		this.sources.build(this.stateManager.state.tree);
	}

	@watch('state.lastSelectedIndex')
	protected onChangeLastSelectedIndex(): void {
		const container =
			this.items.elements[this.stateManager.state.lastSelectedIndex]
				?.container;

		if (container) {
			scrollIntoViewIfNeeded(container, this.items.container, this.j.od);

			container.focus();
		}
	}

	@watch('state.info')
	protected onChangeInfo(): void {
		this.statusbar.value(this.state.info, 'center');
	}

	@watch(['state.currentPath', 'state.currentSource'])
	protected onChangePathOrSource(): void {
		this.statusbar.value(
			this.state.currentPath
				? `${this.state.currentPath} (${this.state.currentSource})`
				: this.i18n('Home'),
			'left'
		);
	}

	@watch('state.showSettings')
	private onChangeShowSettings(): void {
		this.settings.setMod('hidden', !this.stateManager.state.showSettings);
	}

	@watch('state.showPreview')
	private onChangeShowPreview(): void {
		this.preview.setMod('hidden', !this.stateManager.state.showPreview);
	}

	@watch('state.showSideBar')
	private onChangeShowSideBar(): void {
		this.sidebar.setMod('hidden', !this.stateManager.state.showSideBar);
	}

	@watch('state.view')
	private onChangeView(): void {
		this.items.setMod('view', this.stateManager.state.view);
	}

	@watch('state.tileSize')
	private onChangeTileSize(): void {
		this.items.setMod('size', this.stateManager.state.tileSize);
	}

	@watch('state.showFavorites')
	private onChangeShowFavorites(): void {
		this.sidebar.setMod(
			'show-favorites',
			this.stateManager.state.showFavorites
		);
		this.items.setMod(
			'show-favorites',
			this.stateManager.state.showFavorites
		);
	}

	@watch(':dblclickItem.filebrowser')
	protected onItemDblClick(): void | false {
		this.j.e.fire('select.filebrowser');
		return false;
	}

	@watch(':clickItem.filebrowser')
	protected onItemClick(
		data: IFileBrowserItemWrapper,
		multi: boolean
	): void | false {
		this.stateManager.addActive(data, multi);
	}

	@watch(':togglePreview.filebrowser')
	protected onTogglePreview(): void | false {
		this.state.showPreview = !this.state.showPreview;
		return false;
	}

	@watch(':toggleFavoriteItem')
	protected onToggleFavoriteItem(
		data: IFileBrowserItemWrapper
	): void | false {
		this.stateManager.toggleFavorite(data);
	}

	@watch(':openFolder')
	protected onFolderClick(data: IFileBrowserTreeItemPro): void | false {
		this.stateManager.state.currentSource = data.sourceName;
		this.stateManager.state.currentPath = data.path || '/';
		this.j.e.fire('afterOpenFolder.filebrowser');
	}
}
