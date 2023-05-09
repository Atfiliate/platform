/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IJodit } from 'jodit/types';

import { Plugin } from 'jodit/core/plugin';
import { debounce, watch } from 'jodit/core/decorators';
import { Jodit } from '../../index';
import { UITuner } from './ui/tuner/tuner';

import './config';

/**
 * Tune block with popup: move, align, change block tag, and another options
 */
export class tuneBlock extends Plugin {
	/** @override */
	override requires: string[] = ['license'];

	/**
	 * UI element for managing blocks
	 */
	private tuner!: UITuner;

	protected override afterInit(jodit: IJodit): void {
		this.tuner = new UITuner(jodit);
	}

	/**
	 * Handler: click on an element outside the editor or the keyboard closes the tuner
	 */
	@watch(':outsideClick :keydown')
	protected hideTuner(): void {
		this.tuner.hide();
	}

	@watch('j.ed:selectionchange')
	@debounce()
	protected onChangeSelection(): void {
		if (!this.j.s.isCollapsed()) {
			this.hideTuner();
		}
	}

	/**
	 * Handler: click on an element inside the editor
	 */
	@watch(':click')
	protected onClickInBlock(_: MouseEvent): void {
		if (this.j.s.isCollapsed()) {
			this.tuner.show();
		}
	}

	protected override beforeDestruct(jodit: IJodit): void {
		this.tuner.destruct();
	}
}

Jodit.plugins.add('tune-block', tuneBlock);
