/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import type { IFileBrowserStatePro } from '../interface';
import { ViewComponent } from 'jodit/core/component';
import { component, persistent, watch } from 'jodit/core/decorators';
import { FileBrowserItem } from 'jodit/modules/file-browser/builders/item';

@component
export class PersistentStore extends ViewComponent {
	/** @override */
	className(): string {
		return 'PersistentStore';
	}

	constructor(
		jodit: ViewComponent['jodit'],
		readonly state: IFileBrowserStatePro
	) {
		super(jodit);
	}

	@persistent
	theme!: string;

	@persistent
	protected sortBy: string = 'changed-desc';

	@persistent
	protected view: IFileBrowserStatePro['view'] = 'tiles';

	@persistent
	protected foldersPosition: IFileBrowserStatePro['foldersPosition'] = 'top';

	@persistent
	protected tileSize: IFileBrowserStatePro['tileSize'] = 'default';

	@persistent
	protected favorites: IFileBrowserStatePro['favorites'] = [];

	@persistent
	protected showSideBar: boolean = true;

	@persistent
	protected showPreview: boolean = false;

	@persistent
	protected showFavorites: boolean = true;

	@watch('state.theme')
	protected onChangeThemeSetField(): void {
		this.theme = this.state.theme;
	}

	@watch('state.view')
	protected onChangeView(): void {
		this.view = this.state.view;
	}

	@watch('state.sortBy')
	protected onChangeSortBy(): void {
		this.sortBy = this.state.sortBy;
	}

	@watch('state.tileSize')
	protected onChangeTileSize(): void {
		this.tileSize = this.state.tileSize;
	}

	@watch('state.favorites')
	protected onChangeFavorites(): void {
		this.favorites = this.state.favorites;
	}

	@watch('state.showSideBar')
	protected onChangeShowSideBar(): void {
		this.showSideBar = this.state.showSideBar;
	}

	@watch('state.showPreview')
	protected onChangeShowPreview(): void {
		this.showPreview = this.state.showPreview;
	}

	@watch('state.showFavorites')
	protected onChangeShowFavorites(): void {
		this.showFavorites = this.state.showFavorites;
	}

	@watch('state.foldersPosition')
	protected onChangeFoldersPosition(): void {
		this.foldersPosition = this.state.foldersPosition;
	}

	syncWithState(): void {
		this.state.tileSize = this.tileSize;
		this.state.favorites = this.favorites.map((item) => {
			if (item instanceof FileBrowserItem) {
				return item;
			}

			return FileBrowserItem.create(item);
		});

		this.state.view = this.view;
		this.state.theme = this.theme;
		this.state.showSideBar = this.showSideBar;
		this.state.showPreview = this.showPreview;
		this.state.showFavorites = this.showFavorites;
		this.state.sortBy = this.sortBy;
		this.state.foldersPosition = this.foldersPosition;
	}
}
