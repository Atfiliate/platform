/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
export const parentPath = (path: string): string => {
	const parts = path.split('/').filter((p) => p.length);
	parts.pop();
	return parts.join('/') || '/';
};
