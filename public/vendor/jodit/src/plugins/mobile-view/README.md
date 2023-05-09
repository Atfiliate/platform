# Mobile View - Plugin for viewing the contents of the editor in a mobile view

It is often necessary to see how the page will look like in mobile view. You can use the `mobile-view` plugin for this.

## Installation

If you are using a fat build of the editor, then the plugin is already included in it.
If you are using the slim build, then you need to enable it manually.

```html
<!-- js -->
<script src="https://unpkg.com/browse/jodit-pro@1.3.28/build/plugins/mobile-view/mobile-view.js"></script>
<!-- css -->
<link rel='stylesheet' href="https://unpkg.com/browse/jodit-pro@1.3.28/build/plugins/mobile-view/mobile-view.css"></link>

<script>
Jodit.defaultOptions.extraPlugins.push('mobile-view');
Jodit.make('#editor');
</script>
```

## Options

Several resolutions are available by default:

```js
const resolutions = [
	{ value: 'default', title: 'Default' },
	{ value: 375, title: 'iPhone SE' },
	{ value: 414, title: 'iPhone XR' },
	{ value: 390, title: 'iPhone 12 Pro' },
	{ value: 393, title: 'Pixel 5' },
	{ value: 820, title: 'iPad Air' }
];
```

In order to add your own permissions, you need to add the following code in the `config.js` file:

```js
Jodit.defaultOptions.controls.mobileView = {
	...Jodit.defaultOptions.controls.mobileView,
	list: [
		...Jodit.defaultOptions.controls.mobileView.list,
		{ value: 320, title: 'iPhone 5' },
		{ value: 360, title: 'iPhone 6' },
		{ value: 768, title: 'iPad' }
	]
};
```

Or right at the initialization of the editor

```js
Jodit.make('#editor', {
	controls: {
		mobileView: {
			list: [
				{ value: 320, title: 'iPhone 5' },
				{ value: 360, title: 'iPhone 6' },
				{ value: 768, title: 'iPad' }
			]
		}
	}
});
```
