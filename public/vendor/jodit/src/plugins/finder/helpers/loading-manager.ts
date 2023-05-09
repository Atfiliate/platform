/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IFileBrowserPro, IFileBrowserStatePro } from '../interface';
import type { IFileBrowserDataProvider } from 'jodit/types';
import { ViewComponent } from 'jodit/core/component';
import { component, debounce, watch } from 'jodit/core/decorators';

@component
export class LoadingManager extends ViewComponent<IFileBrowserPro> {
	/** @override */
	className(): string {
		return 'LoadingManager';
	}

	/** @override */
	constructor(jodit: IFileBrowserPro, readonly state: IFileBrowserStatePro) {
		super(jodit);
	}

	@watch(':update.filebrowser')
	protected async onUpdateFileBrowser(): Promise<void> {
		this.state.activeElements = [];

		this.j.panel.setMod('loading', true);

		await Promise.all([this.loadFolders(), this.loadItems()]);

		this.j.panel.setMod('loading', false);
	}

	@watch(['state.currentPath', 'state.currentSource'])
	@debounce((ctx) => ({
		timeout: ctx.defaultTimeout,
		promisify: true
	}))
	async loadFolders(): Promise<void> {
		if (!this.j.isOpened) {
			return;
		}

		const { currentPath, currentSource } = this.state;

		try {
			const sources = await this.j.dataProvider.tree(
				currentPath,
				currentSource
			);

			this.j.stateManager.fillTreeForPath(sources, currentPath);
			this.state.sources = sources;
		} catch (e: any) {
			this.j.status(e);
		}
	}

	private __tick: number = 0;

	@watch([
		'state.currentPath',
		'state.currentSource',
		'state.sortBy',
		'state.onlyImages',
		'state.foldersPosition',
		'state.filterWord'
	])
	@debounce((ctx) => ({
		timeout: ctx.defaultTimeout,
		promisify: true
	}))
	async loadItems(): Promise<void> {
		if (!this.j.isOpened) {
			return;
		}

		try {
			this.__tick += 1;
			const { __tick } = this;
			this.offset = 0;
			this.stopLoadingParts = false;
			this.__callQueueCount = 0;

			const { items, loadedTotal } = await loadPartItems(
				this.state,
				this.j.dataProvider,
				this.offset,
				this.countInOneChunk
			);
			this.state.elements = items;

			this.stopLoadingParts = loadedTotal < this.countInOneChunk;

			await this.loadItemsChunk(__tick);
			await this.async.requestIdlePromise();

			if (this.__tick !== __tick) {
				return;
			}

			while (
				!this.stopLoadingParts &&
				this.j.panel.countInColumn * this.j.panel.countInRow >=
					this.state.elements.length
			) {
				await this.loadItemsChunk(__tick);

				if (this.__tick !== __tick) {
					return;
				}
			}
		} catch (e: any) {
			this.j.status(e);
		}
	}

	private offset: number = 0;
	private countInOneChunk: number = 20;
	private stopLoadingParts: boolean = false;

	private __isLoadingPart = false;
	private __callQueueCount = 0;

	private async __loadItemsChunk(tick: number): Promise<void> {
		if (this.__isLoadingPart) {
			this.__callQueueCount += 1;
			return;
		}

		if (this.stopLoadingParts) {
			this.__callQueueCount = 0;
			return;
		}

		this.__isLoadingPart = true;
		this.j.panel.items.setMod('chunk-loading', true);

		try {
			this.offset += this.countInOneChunk;

			const { items, loadedTotal } = await loadPartItems(
				this.state,
				this.j.dataProvider,
				this.offset,
				this.countInOneChunk
			);

			if (this.__tick !== tick) {
				return;
			}

			this.stopLoadingParts = loadedTotal < this.countInOneChunk;

			if (items.length) {
				this.state.elements = this.state.elements.concat(items);
			}
		} catch (e: any) {
			this.j.status(e);
		}

		this.j.panel.items.setMod('chunk-loading', false);
		this.__isLoadingPart = false;

		if (this.__callQueueCount > 0) {
			this.__callQueueCount -= 1;
			return this.__loadItemsChunk(tick);
		}
	}

	@debounce((ctx) => ({
		timeout: ctx.defaultTimeout,
		promisify: true
	}))
	loadItemsChunk(tick: number = this.__tick): Promise<void> {
		if (tick !== this.__tick) {
			return Promise.resolve();
		}

		return this.__loadItemsChunk(tick);
	}
}

function loadPartItems(
	state: IFileBrowserStatePro,
	dataProvider: IFileBrowserDataProvider,
	offset: number,
	limit: number
): ReturnType<IFileBrowserDataProvider['itemsEx']> {
	const {
		currentPath,
		currentSource,
		sortBy,
		withFolders,
		foldersPosition,
		onlyImages,
		filterWord
	} = state;

	return dataProvider.itemsEx(currentPath, currentSource, {
		offset,
		limit,
		sortBy,
		withFolders,
		foldersPosition,
		onlyImages,
		filterWord
	});
}
