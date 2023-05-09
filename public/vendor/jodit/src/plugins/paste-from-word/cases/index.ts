/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { ICaseFn } from '../interface';
import { convertToList } from './convert-to-list';
import { clearAttributes } from './clear-attributes';
import { removeExtraTags } from './remove-extra-tags';
import { replaceOldTags } from './replace-old-tags';
import { removeInsideComment } from './remove-inside-comment';
import { convertStyleUnitToPixels } from './convert-style-unit-to-pixels';
import { clearClassName } from './clear-class-name';
import { processLinks } from './process-links';
import { normalizeImageProps } from './normalize-image-props';
import { removeWidthFromTableCell } from './table';
import { markPageBreakElements } from './mark-page-break';
import { processImage } from './process-image';
import { cleanStyles } from './clean-styles';

export const cases: ICaseFn[] = [
	processImage,
	markPageBreakElements,
	removeExtraTags,
	replaceOldTags,
	clearAttributes,
	convertToList,
	processLinks,
	removeInsideComment,
	convertStyleUnitToPixels,
	clearClassName,
	normalizeImageProps,
	removeWidthFromTableCell,
	cleanStyles
];
