# Jodit Finder

## Advantages

-   Dark and light themes, switchable from the interface.
-   Ability to change the file browser settings right in the interface.
-   Folders in the form of a tree.
-   You can add an image, file or folder to the Favorites section
-   Navigation history with buttons: home, forward and backward.
-   5 tile view modes: very small, small, default, large and extra large.
-   Display mode in the form of compact labels and icons.
-   Folders inside items section like Explorer. You can hide Tree section.
-   Partial loading with infinite scrolling.
-   Fast images preview.
-   Preview office files.

## Use with Jodit

```js
const jodit = Jodit.make('#editor', {
	filebrowser: {
		ajax: {
			url: 'https://xdsoft.net/jodit/finder/'
		},
		uploader: {
			url: 'https://xdsoft.net/jodit/finder/?action=fileUpload'
		}
	}
});

jodit.filebrowser.open((images) => {
	console.log('Selected:', images);
}, true); // true - show only images
```

The entire [list of settings](/jodit/docs/classes/config.Config.html#filebrowser) is available as in the [free version](/jodit/docs/modules/modules_file_browser.html)

## Use without Jodit

```js
const fb = new Jodit.modules.FileBrowserPro({
	ajax: {
		url: 'https://xdsoft.net/jodit/finder/'
	},
	uploader: {
		url: 'https://xdsoft.net/jodit/finder/?action=fileUpload'
	}
});

fb.open((images) => {
	console.log('Selected:', images);
}, true); // true - show only images
```

## Options

#### `previewOfficeURL` (default = "https://view.officeapps.live.com/op/view.aspx?src=")

URL for opening office documents in a preview window in an iframe.
