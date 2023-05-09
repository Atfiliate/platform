# Page Break plugin

This plugin adds support for page breaks and allows the user to insert page breaks into an editor.
This is useful when the CMS uses a custom separator to separate the content into pages.

It also adds a button to the toolbar.

## Options

### pageBreak.separator

-   Type: String
-   Default: '<div style="break-after: page"></div>'

```js
Jodit.make('#editor', {
	pageBreak: {
		separator: '<!-- pagebreak -->'
  }
})
```
