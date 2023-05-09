/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type {
	IFileBrowserStatePro,
	IHistoryItem,
	IHistoryManager
} from '../interface';
import { fastClone } from 'jodit/core/helpers';
import { ViewComponent } from 'jodit/core/component';
import { component, watch } from 'jodit/core/decorators';

@component
export class HistoryManager extends ViewComponent implements IHistoryManager {
	private history: IHistoryItem[] = [];
	private historyIndex: number = 0;

	/** @override */
	className(): string {
		return 'HistoryManager';
	}

	constructor(
		jodit: ViewComponent['jodit'],
		readonly state: IFileBrowserStatePro
	) {
		super(jodit);
	}

	canNext(): boolean {
		return this.historyIndex < this.history.length - 1;
	}

	canPrevious(): boolean {
		return this.historyIndex > 0;
	}

	push(item: IHistoryItem): void {
		let { historyIndex } = this;

		const current = this.history[historyIndex];

		if (
			current &&
			current.currentSource === item.currentSource &&
			current.currentPath === item.currentPath
		) {
			return;
		}

		let history = [...this.history];

		if (history.length - 1 !== historyIndex) {
			history = history.slice(0, historyIndex + 1);
		}

		history.push(item);

		if (current) {
			historyIndex += 1;
		}

		this.history = history;
		this.historyIndex = historyIndex;
	}

	next(): void {
		if (this.canNext()) {
			this.historyIndex += 1;
			this.updateState();
		}
	}

	previous(): void {
		if (this.canPrevious()) {
			this.historyIndex -= 1;
			this.updateState();
		}
	}

	@watch(['state.elements', 'state.tree'])
	updateCurrent(): void {
		this.history[this.historyIndex] = {
			currentSource: this.state.currentSource,
			currentPath: this.state.currentPath,
			tree: fastClone(this.state.tree),
			elements: [...this.state.elements]
		};
	}

	@watch(':goHome.filebrowser')
	protected onHome(): void {
		this.state.currentPath = '';
		this.state.currentSource = '';

		this.j.e.fire('afterOpenFolder.filebrowser update.filebrowser');
	}

	@watch(':afterOpenFolder.filebrowser')
	protected onOpenFolder(): void {
		this.push({
			tree: [],
			elements: [],
			currentPath: this.state.currentPath,
			currentSource: this.state.currentSource
		});

		this.j.e.fire('changeSelection');
	}

	private updateState(): void {
		const { tree, elements, currentSource, currentPath } =
			this.history[this.historyIndex];

		this.state.activeElements = [];
		this.state.elements = [...elements];
		this.state.tree = [...tree];
		this.state.currentSource = currentSource;
		this.state.currentPath = currentPath;

		this.j.e.fire('changeSelection');
	}
}
