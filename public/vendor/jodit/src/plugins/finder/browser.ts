/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './browser.less';
import './ui/assets/icons';

import type {
	IDialogOptions,
	IFileBrowserCallBackData,
	IFileBrowserDataProvider,
	IProgressBar,
	IUploader,
	IUploaderOptions,
	IDictionary,
	IFileBrowserOptions,
	IFileBrowserItemWrapper,
	CanUndef,
	IUIGroup,
	ISourceFile
} from 'jodit/types';

import type {
	IFileBrowserOptionsPro,
	IFileBrowserPro,
	IFileBrowserStatePro,
	IFileBrowserTreeItemPro,
	IHistoryManager
} from './interface';

import { Dom, observable } from 'jodit/modules';
import { Dialog } from 'jodit/modules/dialog';
import { UIBrowserPanel } from './ui/panel/panel';
import {
	ConfigProto,
	css,
	isAbort,
	isString,
	isValidName
} from 'jodit/core/helpers';

import { autobind, component, derive, watch } from 'jodit/core/decorators';
import {
	KEY_DELETE,
	KEY_DOWN,
	KEY_ENTER,
	KEY_LEFT,
	KEY_RIGHT,
	KEY_UP
} from 'jodit/core/constants';
import { StateManager } from './helpers/state-manager';
import { UIBrowserHeader } from './ui/header/header';
import { openImageEditor } from 'jodit/modules/image-editor/image-editor';
import { Config } from 'jodit/config';
import { UIProgress } from './ui/progress/progress';
import { makeDataProvider } from 'jodit/modules/file-browser/factories';
import { Dlgs } from 'jodit/core/traits';
import { PersistentStore } from './helpers/persistent-store';
import { HistoryManager } from './helpers/history-manager';
import { ContextMenuManager } from './helpers/context-menu';
import { parentPath } from './helpers/helpers';
import { Jodit } from '../../index';
import { license } from '../license/license';
import { UILightBox } from './ui/lightboox/lightbox';
import { LoadingManager } from './helpers/loading-manager';

interface IFileBrowserSimleItem {
	type: ISourceFile['type'];
	name?: string;
	file?: string;
	path: string;
	sourceName: string;
}

// @ts-ignore
export interface FileBrowserPro extends Dlgs {}

@component
@derive(Dlgs)
export class FileBrowserPro extends Dialog implements IFileBrowserPro {
	readonly dataProvider: IFileBrowserDataProvider = makeDataProvider(
		this,
		this.options
	);

	readonly state = observable({
		onSelectCallBack: null,
		theme: 'default',
		showSideBar: true,
		showFavorites: true,
		showSettings: false,
		showPreview: false,

		withFolders: true,
		foldersPosition: 'bottom',

		info: '',
		metaInfo: null,

		currentPath: '',
		currentSource: '',
		currentBaseUrl: '',

		tree: [],
		activeElements: [],
		favorites: [],

		progress: 0,
		lastSelectedIndex: 0,
		elements: [],
		messages: [],
		sources: [],
		view: 'tiles',
		tileSize: 'default',
		sortBy: 'name-asc',
		filterWord: '',
		onlyImages: false
	} as IFileBrowserStatePro);

	readonly persistent: PersistentStore = new PersistentStore(
		this,
		this.state
	);

	loadingManager: LoadingManager = new LoadingManager(this, this.state);
	stateManager: StateManager = new StateManager(this.state);
	historyManager: IHistoryManager = new HistoryManager(this, this.state);
	contextMenuManager: ContextMenuManager = new ContextMenuManager(this);

	override OPTIONS!: IFileBrowserOptionsPro;

	/** @override */
	override className(): string {
		return 'FileBrowserPro';
	}

	/** @override */
	override lock(name: string = 'any'): boolean {
		this.container.classList.add('jodit_disabled');
		return super.lock(name);
	}

	override unlock(): boolean {
		this.container.classList.remove('jodit_disabled');
		return super.unlock();
	}

	@autobind
	status(
		message: string | Error,
		success: boolean = !(message instanceof Error)
	): void {
		if (isAbort(message)) {
			return;
		}

		// @ts-ignore
		if (!isProd && !isString(message)) {
			console.error(message);
		}

		this.message.message(
			isString(message) ? message : message.message,
			success ? 'success' : 'error',
			this.options.howLongShowMsg
		);
	}

	private header = new UIBrowserHeader(this, this.options, this.stateManager);

	panel: UIBrowserPanel = new UIBrowserPanel(this, this.stateManager);

	files: IUIGroup = this.panel;
	tree: IUIGroup = this.panel;

	override progressbar: IProgressBar = new UIProgress(
		this,
		this.stateManager.state
	);

	constructor(options?: IFileBrowserOptionsPro) {
		super(
			ConfigProto(
				Object.assign(options || {}, {
					resizable: true,
					draggable: true,
					toolbarButtons:
						options?.toolbarButtons ||
						Config.defaultOptions.filebrowser.buttons,
					buttons: Jodit.atom([
						'filebrowser.settings',
						'fullsize',
						'dialog.close'
					])
				}),
				Config.defaultOptions.filebrowser
			) as IDialogOptions
		);

		license.make(this);

		if (!this.persistent.theme && this.options.theme) {
			this.persistent.theme = this.options.theme;
		}

		this.panel.append(this.progressbar);
		this.toolbar.setMod('mode', 'header');

		this.setSize(
			Math.min(this.options.width, screen.width),
			Math.min(this.options.height, screen.height)
		).setHeader(this.header);

		this.onResizeWindow();
		this.initUploader();
		this.onChangeTheme();
		this.fullFillOptions();

		this.dataProvider.onProgress((percentage) => {
			if (percentage === 0) {
				percentage = 30;
			}

			this.state.progress = percentage;
		});

		this.e.on('beforeClose', this.removeGlobalListeners);

		this.e.fire('afterInit');

		Jodit.prototype.afterInitHook.call(this);
	}

	/** @override */
	protected override addDisclaimer(elm: HTMLElement): void {
		this.dialog.appendChild(elm);
	}

	// @ts-ignore
	async open(
		callback: CanUndef<(_: IFileBrowserCallBackData) => void> = this.o
			.defaultCallback,
		onlyImages?: boolean
	): Promise<void> {
		this.state.onlyImages = Boolean(onlyImages);
		this.prepareOpening(callback);
		super.open(this.panel.container);

		return this.e.fire('update.filebrowser');
	}

	/**
	 * Resize handler
	 */
	@watch(':resize', window)
	private onResizeWindow(): void {
		css(this.dialog, {
			maxWidth: screen.width,
			minHeight: Math.min(this.options.height, screen.height),
			minWidth: Math.min(this.options.width, screen.width)
		});
	}

	@watch(['state.currentPath', 'state.currentSource'])
	protected onChangePath(): void {
		const { currentPath, currentSource } = this.state;

		this.uploader.setPath(currentPath);
		this.uploader.setSource(currentSource);
	}

	@watch('state.theme')
	protected onChangeTheme(): void {
		this.setMod('theme', this.state.theme);
		this.header.setMod('theme', this.state.theme);
		this.panel.setMod('theme', this.state.theme);
		this.options.theme = this.state.theme;
	}

	@watch(':toggleSettings.filebrowser')
	protected onToggleSettings(): void {
		this.state.showSettings = !this.state.showSettings;
	}

	private prepareOpening(
		callback?: (data: IFileBrowserCallBackData) => void
	): void {
		this.registerGlobalListeners();

		if (callback) {
			this.state.onSelectCallBack = (data): void => {
				this.close();
				callback(data);
			};
		}

		this.persistent.syncWithState();
	}

	private registerGlobalListeners(): void {
		this.e.on(this.ow, 'keydown', this.onKeyPress);
	}

	@autobind
	private onKeyPress(e: KeyboardEvent): void | false {
		const { activeElement } = this.od;

		if (
			!this.state.activeElements.length ||
			!activeElement ||
			!Dom.isOrContains(this.panel.items.container, activeElement)
		) {
			return;
		}

		const elms = this.state.elements;

		switch (e.key) {
			case KEY_ENTER: {
				return this.onChooseItems();
			}

			case KEY_DELETE: {
				return this.onFileRemove();
			}

			case KEY_RIGHT:
			case KEY_LEFT:
			case KEY_DOWN:
			case KEY_UP: {
				const next = e.key === KEY_RIGHT || e.key === KEY_DOWN,
					index = this.state.lastSelectedIndex;

				let nextIndex;

				if ([KEY_RIGHT, KEY_LEFT].includes(e.key)) {
					if (next) {
						nextIndex = !elms[index + 1] ? 0 : index + 1;
					} else {
						nextIndex = !elms[index - 1]
							? elms.length - 1
							: index - 1;
					}
				} else {
					const { countInRow } = this.panel;

					nextIndex = Math.round(
						((index + 1) / countInRow + (next ? 1 : -1)) *
							countInRow -
							1
					);
				}

				elms[nextIndex] &&
					this.stateManager.addActive(elms[nextIndex], e.shiftKey);

				return false;
			}
		}
	}

	@autobind
	private removeGlobalListeners(): void {
		this.e.off(this.ow, 'keydown', this.onKeyPress);
	}

	@watch(':fileRemove.filebrowser')
	protected onFileRemove(): void {
		if (this.state.activeElements.length) {
			this.confirm('Are you sure?', 'Delete', (yes: boolean) => {
				yes && void this.__itemsRemove(this.state.activeElements);
			}).bindDestruct(this);
		}
	}

	private __itemsRemove(items: IFileBrowserSimleItem[]): Promise<unknown> {
		if (!items.length) {
			return Promise.resolve();
		}

		const promises: Array<Promise<any>> = [];

		items.forEach((item) => {
			promises.push(
				item.type === 'folder'
					? this.__folderRemove(
							parentPath(item.path),
							item.name!,
							item.sourceName
					  )
					: this.__removeFile(
							item.file || item.name || '',
							item.sourceName
					  )
			);
		});

		this.state.activeElements.forEach((el) => {
			this.stateManager.isFavorite(el) &&
				this.stateManager.toggleFavorite(el);
		});
		this.state.activeElements = [];

		return Promise.allSettled(promises).then(() =>
			Promise.allSettled([
				this.loadingManager.loadItems(),
				this.loadingManager.loadFolders()
			])
		);
	}

	private __removeFile(name: string, source: string): Promise<void> {
		return this.dataProvider
			.fileRemove(this.state.currentPath, name, source)
			.then((message) => {
				this.status(
					message || this.i18n('File "%s" was deleted', name),
					true
				);
			})
			.catch(this.status);
	}

	private __folderRemove(
		path: string,
		name: string,
		sourceName: string
	): Promise<void> {
		return this.dataProvider
			.folderRemove(path, name, sourceName)
			.then((message) => {
				this.status(
					message || this.i18n('Folder "%s" was deleted', name),
					true
				);

				if (this.state.currentPath === path) {
					this.state.currentPath = parentPath(path);
					this.state.currentSource = sourceName;
				}
			})
			.catch(this.status);
	}

	@watch(':edit.filebrowser')
	protected onFileEdit(): void {
		if (this.state.activeElements.length === 1) {
			const [file] = this.state.activeElements;

			openImageEditor.call(
				this,
				file.fileURL,
				file.file || '',
				file.path,
				file.sourceName,
				undefined,
				this.status
			);
		}
	}

	@watch(':folderRename.filebrowser')
	protected onFolderRename(data: IFileBrowserTreeItemPro): void {
		this.prompt(
			'Enter new name',
			'Rename',
			(newName: string): false | void => {
				if (!isValidName(newName) || newName === data.name) {
					this.status(this.i18n('Enter new name'));
					return false;
				}

				this.dataProvider
					.folderRename(
						parentPath(data.path),
						data.name,
						newName,
						data.sourceName
					)
					.then((message) => {
						this.state.activeElements = [];
						this.status(message, true);

						this.state.currentPath =
							parentPath(data.path) + '/' + newName;
						this.state.currentSource = data.sourceName;

						this.historyManager.updateCurrent();
						this.loadingManager.loadFolders();
					})
					.catch(this.status);

				return;
			},
			this.i18n('type name'),
			data.name
		).bindDestruct(this);
	}

	@watch(':folderRemove.filebrowser')
	protected onFolderRemove(data: IFileBrowserTreeItemPro): void {
		this.confirm('Are you sure?', 'Delete', (yes: boolean) => {
			yes &&
				void this.__itemsRemove([
					{
						type: 'folder',
						name: data.name,
						path: data.path,
						sourceName: data.sourceName
					}
				]);
		}).bindDestruct(this);
	}

	@watch(':folderCreate.filebrowser')
	protected onFolderCreate(data: IFileBrowserTreeItemPro): void {
		this.prompt(
			'Enter Directory name',
			'Create directory',
			(name: string) => {
				const path = data.path || '/';
				this.dataProvider
					.createFolder(name, data.path || '/', data.sourceName)
					.then(() => {
						if (
							this.state.currentSource === data.sourceName &&
							this.state.currentPath === path
						) {
							this.e.fire('update.filebrowser');
						} else {
							this.state.currentSource = data.sourceName;
							this.state.currentPath = path;
						}

						this.historyManager.updateCurrent();
					}, this.status);
			},
			this.i18n('type name')
		).bindDestruct(this);
	}

	@watch(':fileRename.filebrowser')
	protected onFileRename(item: IFileBrowserItemWrapper): void {
		const name = item.file || item.name || '';
		if (this.state.activeElements.length === 1 && name) {
			this.prompt(
				'Enter new name',
				'Rename',
				(newName: string): false | void => {
					if (!isValidName(newName)) {
						this.status(this.i18n('Enter new name'));
						return false;
					}

					this.dataProvider
						.fileRename(
							this.state.currentPath,
							name,
							newName,
							this.state.currentSource
						)
						.then((message) => {
							this.state.activeElements = [];
							this.status(message, true);

							void this.loadingManager.loadItems();
						})
						.catch(this.status);

					return;
				},
				this.i18n('type name'),
				name
			).bindDestruct(this);
		}
	}

	@watch(':select.filebrowser')
	protected onChooseItems(): void | false {
		const act = this.stateManager.state.activeElements;

		if (act.length) {
			if (act[0].type === 'folder') {
				this.state.currentPath =
					this.state.currentPath + '/' + act[0].name;
				this.state.currentSource = act[0].sourceName;

				this.e.fire('afterOpenFolder.filebrowser');
				return;
			}

			if (this.state.onSelectCallBack) {
				this.stateManager.callSelectHandler();
			} else {
				this.onOpenLightBox(act[0]);
			}
		}
	}

	@watch(':openLightBox.filebrowser')
	protected onOpenLightBox(item: IFileBrowserItemWrapper): void {
		UILightBox.open(this, item, this.state.elements);
	}

	private uploader!: IUploader;

	private initUploader(): void {
		const self = this,
			uploaderOptions: IUploaderOptions<IUploader> = ConfigProto(
				self.o.uploader || {},
				Config.defaultOptions.uploader
			) as IUploaderOptions<IUploader>;

		const uploadHandler = (): Promise<void> =>
			this.loadingManager.loadItems();

		self.uploader = self.getInstance('Uploader', uploaderOptions);
		self.uploader.bind(self.panel.container, uploadHandler, self.status);

		self.e.on('bindUploader.filebrowser', (button: HTMLElement) => {
			self.uploader.bind(button, uploadHandler, self.status);
		});
	}

	/** @override */
	override destruct(): void {
		this.removeGlobalListeners();
		this.header.destruct();
		this.panel.destruct();
		super.destruct();
	}

	private fullFillOptions(): void {
		const keys: Array<keyof IFileBrowserOptions> = [
			'getLocalFileByUrl',
			'crop',
			'resize',
			'create',
			'fileMove',
			'folderMove',
			'fileRename',
			'folderRename',
			'fileRemove',
			'folderRemove',
			'folder',
			'items',
			'permissions'
		];

		keys.forEach((key) => {
			if (this.options[key] != null) {
				(this.options as IDictionary)[key] = ConfigProto(
					this.options[key] as IDictionary,
					this.o.ajax
				);
			}
		});
	}
}

Object.defineProperty(Jodit.modules, 'FileBrowserPro', {
	value: FileBrowserPro,
	writable: false,
	enumerable: true,
	configurable: true
});
