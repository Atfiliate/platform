/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type {
	IDialogOptions,
	IDictionary,
	IFileBrowser,
	IFileBrowserCallBackData,
	IFileBrowserOptions,
	IFileBrowserState,
	Nullable,
	IObservable
} from 'jodit/types';
import type { PersistentStore } from './helpers/persistent-store';
import type { StateManager } from './helpers/state-manager';
import type { ContextMenuManager } from './helpers/context-menu';
import type { IViewOptionsPro } from '../../types/view';
import type { UIBrowserPanel } from './ui/panel/panel';
import type { LoadingManager } from './helpers/loading-manager';

export interface IFileBrowserStatePro extends IFileBrowserState {
	theme: string;
	onSelectCallBack: Nullable<(data: IFileBrowserCallBackData) => void>;

	showSideBar: boolean;
	showSettings: boolean;
	showFavorites: boolean;
	showPreview: boolean;

	lastSelectedIndex: number;

	withFolders: boolean;
	foldersPosition: 'top' | 'bottom' | 'default';

	progress: number;

	info: string;
	metaInfo: Nullable<IDictionary>;

	tileSize: 'xsmall' | 'small' | 'default' | 'large' | 'xlarge';

	favorites: IFileBrowserState['activeElements'];
	tree: IFileBrowserTreeItemPro[];
}

// @ts-ignore
export interface IFileBrowserOptionsPro
	extends IFileBrowserOptions,
		IDialogOptions,
		IViewOptionsPro {
	toolbarButtons: IFileBrowserOptions['buttons'];
	maxWidth: number;

	previewOfficeURL: string;
}

export interface IFileBrowserTreeItemPro {
	type: 'file' | 'directory' | 'source';

	name: string;
	title?: string;
	isCollapsed?: boolean;
	isActive?: boolean;
	path: string;
	sourceName: string;

	children: IFileBrowserTreeItemPro[];
}

export interface IFileBrowserPro extends IFileBrowser<IFileBrowserOptionsPro> {
	readonly state: IFileBrowserStatePro & IObservable;
	readonly persistent: PersistentStore;
	readonly loadingManager: LoadingManager;
	readonly stateManager: StateManager;
	readonly historyManager: IHistoryManager;
	readonly contextMenuManager: ContextMenuManager;
	readonly panel: UIBrowserPanel;
}

export interface IHistoryManager {
	canNext(): boolean;
	canPrevious(): boolean;

	push(item: IHistoryItem): void;
	next(): void;
	previous(): void;

	updateCurrent(): void;
}

export interface IHistoryItem {
	currentPath: IFileBrowserStatePro['currentPath'];
	currentSource: IFileBrowserStatePro['currentSource'];
	tree: IFileBrowserStatePro['tree'];
	elements: IFileBrowserStatePro['elements'];
}
