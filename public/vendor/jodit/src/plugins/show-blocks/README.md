# Show blocks

This plugin adds the command to visualize all block-level elements by surrounding them with an outline and displaying their element name at the top-right.

## Options
```js
Jodit.make('#editor', {
	showBlocks: {
        enable: false,
        color: '#ccc',
        tagList: ['p', 'div', '...']
    }
});
```

## Commands
* enableShowBlocks
* disableShowBlocks
* toggleShowBlocks

```js
const editor = Jodit.make('#editor');
editor.execCommand('toggleShowBlocks');
```
