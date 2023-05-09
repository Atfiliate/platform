# Jodit Editor Pro Version

PRO Jodit editor version with auto-loading of language files and more plugins.

## Comparison Jodit vs Jodit PRO vs Jodit OEM

| Tables      |     Jodit      |          Jodit PRO          |          Jodit OEM          |
| ----------- | :------------: | :-------------------------: | :-------------------------: |
| NPM package |      yes       |             yes             |             yes             |
| Open source |      yes       |            limit            |            limit            |
| Support     |       no       |            limit            |             yes             |
| Plugins     | out-of-the-box | out-of-the-box + [9](#plgs) | out-of-the-box + [9](#plgs) |
| FileBrowser | out-of-the-box |       Jodit Finder\*        |       Jodit Finder\*        |
| ColorPicker |     limit      |             yes             |             yes             |
| Use         |      Free      |          `1 host`           |         `Any host`          |
| License     |      MIT       |     [Commerce][license]     |     [Commerce][license]     |
| Trial       |       No       |             Yes             |             Yes             |
| Demo        | [Demo][jodit]  |         [Demo][pro]         |         [Demo][pro]         |
| Price       |      Free      |            100$             |            400$             |
|             |       -        |         [Buy][buy]          |         [Buy][buy]          |

## <a name="plgs"></a>Extra plugins

| Name                      |  Jodit  | Jodit PRO | Jodit OEM |
| ------------------------- | :-----: | :-------: | :-------: |
| [Custom Color Picker][cp] | Limited |    yes    |    yes    |
| [Backup Plugin][bckp]     |   no    |    yes    |    yes    |
| [Emoji][emoji]            |   no    |    yes    |    yes    |
| [AutoComplete][atcmpl]    |   no    |    yes    |    yes    |
| [Show Blocks][shblcks]    |   no    |    yes    |    yes    |
| [Tune Block][tune]        |   no    |    yes    |    yes    |
| [Google Search][gsearch]  |   no    |    yes    |    yes    |
| [Change case][chngcs]     |   no    |    yes    |    yes    |
| [Paste code][pstcd]       |   no    |    yes    |    yes    |

> You can [buy it here](https://xdsoft.net/jodit/pro/)

## Install

### Via npm

```bash
npm i jodit-pro
```

### Via yarn

```bash
yarn add jodit-pro
```

```html
<link rel="stylesheet" href="./node_modules/jodit-pro/build/jodit.css" />
<script src="./node_modules/jodit-pro/build/jodit.js"></script>
```

```html
<textarea id="editor" cols="30" rows="10"></textarea>
<script>
	const jodit = new Jodit('#editor', {
		width: 1000
	});
</script>
```

-   Jodit Finder in progress

[jodit]: https://xdsoft.net/jodit/
[pro]: https://xdsoft.net/jodit/pro/
[buy]: https://xdsoft.net/jodit/pro/
[license]: https://xdsoft.net/jodit/pro/license
[cp]: ./src/plugins/color-picker/README.md
[bckp]: ./src/plugins/backup/README.md
[emoji]: ./src/plugins/emoji/README.md
[atcmpl]: ./src/plugins/autocomplete/README.md
[shblcks]: ./src/plugins/show-blocks/README.md
[tune]: ./src/plugins/tune-block/README.md
[gsearch]: ./src/plugins/google-search/README.md
[chngcs]: ./src/plugins/change-case/README.md
[pstcd]: ./src/plugins/paste-code/README.md
