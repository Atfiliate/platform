# PRO HTML Paste Processing Plugin from MSWord

Users paste a lot from Word and Excel. Jodit HTML Editor cleans up all unnecessary code and makes HTML just beautiful.

To enable, you need to set `pasteFromWord.enable`.

```js
Jodit.make('#editor', {
  pasteFromWord: {
    enable: true,
    convertUnitsToPixel: true,
    allowedStyleProps: [
      'background',
      'background-color',
      'border',
      'border-.*',
      'color',
      'font-family',
      'font-size',
      'font-style',
      'font-weight',
      'height',
      'line-height',
      'list-style-type',
      'margin',
      'margin-bottom',
      'margin-left',
      'margin-right',
      'margin-top',
      'padding',
      'text-align',
      'text-decoration',
      'text-indent',
      'vertical-align',
      'width',
    ]
  }
})
```

> `convertUnitsToPixel` - will convert all 'cm/pt' units to pixels

To completely disable the plugin:

```js
Jodit.make('#editor', {
  disablePlugins: ['pasteFromWordPro']
})
```

Plugin works in combination with options `askBeforePasteFromWord` and `defaultActionOnPaste`(`defaultActionOnPasteFrmWord`)

```js
Jodit.make('#editor', {
  askBeforePasteFromWord: false,
  pasteFromWord: {
    enable: true,
    convertUnitsToPixel: true
  },
  beautifyHTML: false,
  defaultActionOnPaste: Jodit.INSERT_AS_HTML
})
```

## Styles for nested list

In order for the counters to work correctly, i.e. nested lists have been numbered 1 - 1.1, 1.2 must have style in your css

```css
ul ol[data-list-style-type='decimal'],
ol ol[data-list-style-type='decimal'] {
  counter-reset: item;
}

ol ol[data-list-style-type='decimal'] > li,
ul ol[data-list-style-type='decimal'] > li {
  display: block;
}

ol ol[data-list-style-type='decimal'] > li:before,
ul ol[data-list-style-type='decimal'] > li:before {
  content: counters(item, '.') '. ';
  counter-increment: item;
}
```
