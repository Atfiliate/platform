/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import { JoditPro } from './JoditPro';

import * as plugins from './plugins';

Object.keys(plugins).forEach((pluginName) =>
	JoditPro.plugins.add(pluginName, (plugins as any)[pluginName])
);

export const Jodit = JoditPro;
