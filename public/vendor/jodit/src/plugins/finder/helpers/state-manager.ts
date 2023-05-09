/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type {
	IFileBrowserStatePro,
	IFileBrowserTreeItemPro
} from '../interface';
import type {
	IFileBrowserItem,
	ISource,
	ISourcesFiles,
	IUniqueHash
} from 'jodit/types/file-browser';
import type { Nullable } from 'jodit/types';
import { autobind } from 'jodit/core/decorators';

export class StateManager {
	constructor(readonly state: IFileBrowserStatePro) {}

	@autobind
	getIndex(
		elm: IUniqueHash,
		elms: IUniqueHash[] = this.state.elements
	): number {
		return elms.findIndex(
			(item) => item.uniqueHashKey === elm.uniqueHashKey
		);
	}

	@autobind
	isActive(item: IUniqueHash): boolean {
		return Boolean(
			this.state.activeElements.find(
				(data) => data.uniqueHashKey === item.uniqueHashKey
			)
		);
	}

	@autobind
	isFavorite(item: IUniqueHash): boolean {
		return Boolean(
			this.state.favorites.find(
				(data) => data.uniqueHashKey === item.uniqueHashKey
			)
		);
	}

	addActive(item: IFileBrowserItem, multi: boolean): void {
		this.state.metaInfo = item;
		this.state.info = item.file ?? '';
		this.state.lastSelectedIndex = this.getIndex(item);
		this.state.activeElements = multi
			? [...this.state.activeElements, item]
			: [item];
	}

	callSelectHandler(): void {
		const act = this.state.activeElements;

		this.state.onSelectCallBack?.call(this, {
			baseurl: '',
			files: act.map((data) => data.fileURL),
			isImages: act.map((data) => Boolean(data.isImage))
		});
	}

	setFilter(value: string): void {
		this.state.filterWord = value;
	}

	toggleFavorite(item: IFileBrowserItem): void {
		const favoriteIndex = this.getIndex(item, this.state.favorites);

		const favorites = [...this.state.favorites];

		if (favoriteIndex === -1) {
			favorites.push(item);
		} else {
			favorites.splice(favoriteIndex, 1);
		}

		this.state.favorites = favorites;
	}

	fillTreeForPath(sources: ISourcesFiles, path: string): void {
		if (!this.state.tree.length || !path || path === '/') {
			this.state.tree = sources.map(sourceToTreeItem);
			return;
		}

		this.removeActive(this.state.tree);

		sources.forEach((source) => {
			let sourceItem = findItem(this.state.tree, source.name);

			if (!sourceItem) {
				sourceItem = sourceToTreeItem(source);
				this.state.tree.push(sourceItem);
			}

			sourceItem.isActive = true;

			const childrenItem = findTreeItem(path, sourceItem);

			if (!childrenItem) {
				return;
			}

			childrenItem.isActive = true;

			childrenItem.children = filterFolders(source.folders).map(
				(folder) =>
					folderToTreeItem(folder, path + '/' + folder, source.name)
			);
		});

		this.state.tree = [...this.state.tree];
	}

	private removeActive(tree: IFileBrowserTreeItemPro[]): void {
		tree.forEach((item) => {
			item.isActive = false;
			this.removeActive(item.children);
		});
	}

	get isFavoriteItems(): boolean {
		return this.state.favorites === this.state.elements;
	}
}

function findTreeItem(
	path: string,
	sourceItem: IFileBrowserTreeItemPro
): Nullable<IFileBrowserTreeItemPro> {
	return path
		.split('/')
		.reduce<Nullable<IFileBrowserTreeItemPro>>(
			(item, part) => item && findItem(item.children, part),
			sourceItem
		);
}

function findItem(
	children: IFileBrowserTreeItemPro[],
	name: string
): Nullable<IFileBrowserTreeItemPro> {
	return children.find((item) => item.name === name) ?? null;
}

function filterFolders(folders: string[]): string[] {
	return folders.filter((folder) => folder !== '.' && folder !== '..');
}

function sourceToTreeItem(source: ISource): IFileBrowserTreeItemPro {
	return <IFileBrowserTreeItemPro>{
		type: 'source',
		name: source.name,
		title: source.title,
		sourceName: source.name,
		path: '/',
		children: filterFolders(source.folders).map((folder) =>
			folderToTreeItem(folder, folder, source.name)
		)
	};
}

function folderToTreeItem(
	name: string,
	path: string,
	sourceName: string
): IFileBrowserTreeItemPro {
	return {
		type: 'directory',
		name,
		path,
		sourceName,
		children: []
	};
}
