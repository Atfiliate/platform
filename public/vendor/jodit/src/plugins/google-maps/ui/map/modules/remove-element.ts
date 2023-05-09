/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { UIMap } from '../map';
import type { IUIMapElement } from '../../../interface';

export function removeElement(this: UIMap, newElm: IUIMapElement): void {
	const index = this.mapElements.indexOf(newElm);

	if (index !== -1) {
		const elm = this.mapElements[index];
		elm.gme.setMap(null);
		this.mapElements.splice(index, 1);
		this.state.elements.splice(index, 1);

		this.state.elements = [...this.state.elements];
	}
}
