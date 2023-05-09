/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import './progress.less';

import type { IProgressBar } from 'jodit/types';
import type { IFileBrowserStatePro } from '../../interface';
import { ProgressBar } from 'jodit/core/ui';
import { component, watch } from 'jodit/core/decorators';

@component
export class UIProgress extends ProgressBar implements IProgressBar {
	/** @override */
	override className(): string {
		return 'UIProgress';
	}

	constructor(
		jodit: ProgressBar['jodit'],
		readonly state: IFileBrowserStatePro
	) {
		super(jodit);
		this.onProgress();
	}

	@watch('state.progress')
	private onProgress(): void {
		if (this.state.progress) {
			this.show();
		} else {
			this.hide();
		}

		this.progress(this.state.progress);
	}

	override hide(): IProgressBar {
		this.setMod('hidden', true);
		return this;
	}

	override progress(percentage: number): IProgressBar {
		this.container.style.width = percentage.toFixed(2) + '%';

		if (percentage >= 98) {
			this.j.async.setTimeout(
				() => {
					this.hide();
				},
				{
					label: 'progress',
					timeout: 300
				}
			);
		}

		return this;
	}

	override show(): IProgressBar {
		this.setMod('hidden', false);
		return this;
	}
}
