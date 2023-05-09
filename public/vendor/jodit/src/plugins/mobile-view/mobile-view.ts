/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './mobile-view.less';

import type { IJodit } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Jodit } from '../../index';
import { component, watch } from 'jodit/core/decorators';
import { css, dataBind } from 'jodit/core/helpers/utils';

import { dataBindCurrentKey, dataBindStoredKey } from './config';

@component
class MobileView extends Plugin {
	override requires = ['license'];

	override buttons = [
		{
			name: 'mobileView',
			group: 'state'
		}
	];

	private __currentMode: 'default' | number = 'default';

	protected override afterInit(jodit: IJodit): void {
		jodit.registerCommand('mobileView', {
			exec: (_: unknown, _2: unknown, size: 'default' | number): void => {
				if (this.__currentMode === size) {
					size = 'default';
				}

				this.__currentMode = size;
				dataBind(jodit, dataBindCurrentKey, size);

				if (this.__currentMode !== 'default') {
					dataBind(jodit, dataBindStoredKey, size);
				}

				if (size === 'default') {
					css(this.jodit.workplace, {
						width: null,
						margin: null
					});
				} else {
					css(this.j.workplace, {
						width: size,
						margin: '0 auto'
					});
				}
			}
		});

		jodit.events.on('beforeSetMode', () => {});
	}

	@watch(':beforeSetMode.mobileView')
	protected __beforeSetMode(): void {
		if (this.__currentMode !== 'default') {
			this.j.execCommand('mobileView', false, 'default');
		}
	}

	protected override beforeDestruct(jodit: IJodit): void {}
}

Jodit.plugins.add('mobileView', MobileView);
