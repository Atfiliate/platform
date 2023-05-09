/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './config';

import type { IJodit, IPlugin } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Dom } from 'jodit/core/dom/dom';
import { Icon } from 'jodit/core/ui/icon';
import { getContainer, extendLang } from 'jodit/core/global';
import { autobind, cache } from 'jodit/core/decorators';
import { Jodit } from '../../index';

function svgToUrl(svg: string): string {
	return `data:image/svg+xml;utf8,${escape(svg)}`;
}

/**
 * Plugin for showing special markers inside every blocks
 */
export class showBlocks extends Plugin implements IPlugin {
	/** @override */
	override requires = ['license'];

	/** @override */
	override buttons: Plugin['buttons'] = [
		{
			name: 'showBlocks',
			group: 'state'
		}
	];

	@cache
	private get style(): HTMLStyleElement {
		return getContainer(this.jodit, showBlocks, 'style', true);
	}

	/**
	 * Show block is enabled
	 */
	private isEnabled: boolean = false;

	/**
	 * Enable showing block
	 */
	@autobind
	private enable(): void {
		this.isEnabled = true;

		const root = this.j.o.iframe ? 'body' : '.jodit-wysiwyg';

		const { tagList, color } = this.j.o.showBlocks;

		this.style.innerHTML = tagList
			.map(
				(tag) => `${root} ${tag}{
					outline: 1px dashed ${color};
					background-image: url("${svgToUrl(
						'<svg xmlns="http://www.w3.org/2000/svg" width="50px">' +
							'<text dominant-baseline="hanging" text-anchor="end" style="fill: ' +
							color +
							';font: 10px sans-serif" x="50px" y="0">' +
							tag +
							'</text>' +
							'</svg>'
					)}");
					background-position: top 2px ${
						this.j.o.direction === 'rtl' ? 'left' : 'right'
					} 4px;
					background-repeat: no-repeat;
					position: relative;
				}`
			)
			.join('');
	}

	/**
	 * Disable showing block
	 */
	@autobind
	private disable(): void {
		this.isEnabled = false;
		this.style.innerHTML = '';
	}

	/**
	 * Toggle showing block
	 */
	@autobind
	private toggle(): void {
		this.isEnabled ? this.disable() : this.enable();
		this.j.e.fire('updateToolbar');
	}

	constructor(jodit: IJodit) {
		super(jodit);
		extendLang(require('./langs'));
		Icon.set('showBlocks', require('./show-blocks.svg'));
	}

	/** @override */
	protected afterInit(jodit: IJodit): void {
		jodit.e.on('showBlocksEnabled', () => this.isEnabled);

		jodit
			.registerCommand('enableShowBlocks', this.enable)
			.registerCommand('disableShowBlocks', this.disable)
			.registerCommand('toggleShowBlocks', this.toggle);

		if (this.j.o.showBlocks.enable) {
			this.enable();
		}
	}

	/** @override */
	protected beforeDestruct(jodit: IJodit): void {
		this.disable();
		Dom.safeRemove(this.style);
	}
}

Jodit.plugins.add('show-blocks', showBlocks);
