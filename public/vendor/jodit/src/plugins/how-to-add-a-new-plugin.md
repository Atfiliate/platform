# How to add a new plugin

-   1. Create folder and file with the same name (ex. my-own-plugin)
-   2. Create file with class witch extends `jodit/core/plugin`

```ts
import { Plugin } from 'jodit/core/plugin';
import type { IJodit } from 'jodit/types';
import { Jodit } from '../../index';

class MyOwnPlugin extends Plugin {
	protected override afterInit(jodit: IJodit): void {}
	protected override beforeDestruct(jodit: IJodit): void {}
}

Jodit.plugins.add('myOwnPlugin', MyOwnPlugin);
```

-   3. Pay attention to the last line - it is required `Jodit.plugins.add('myOwnPlugin', myOwnPlugin);`
-   4. Add in `config.js` in the array `Jodit.defaultOptions.extraPlugins` this name `my-own-plugin`
-   5. Add in `make.js` in the array `paths` this name `./src/plugins/my-own-plugin`
-   6. Add in `index.html` and `test/test.html` script tag `<script src="./build/plugins/my-own-plugin/my-own-plugin.js"></script>`

Run project:

```bash
npm start
```
