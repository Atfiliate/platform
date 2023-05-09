/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IDictionary, IJodit } from 'jodit/types';
import type { JElement } from './element';

export type ICaseContext = IDictionary & { jodit: IJodit; rtf: string };
export interface ICaseFn {
	(elm: JElement, context: ICaseContext): null | JElement;
}

export interface RenderFilter {
	(elm: JElement): boolean;
}
