# Tune block

Tune block with popup: move, align, change block tag, and another options

## Options

Plugin settings allow you to set a set of options for any tag that the user clicks on.
This is done through the option `tuneBlock.popup`

For example, let's set the ability in the editor in the tune block to switch the direction of the text.

```js
Jodit.make('#editor', {
	tuneBlock: {
		popup: {
			p: Jodit.atom(['align', 'tune.up', 'tune.remove', 'tune.down'])
		}
	}
});
```

Tune block has several button options by default, here they are:

-   `tune.up` - move block up
-   `tune.remove` - delete block
-   `tune.down` - move block down
-   `tune.h1` - make from block Heading 1
-   `tune.h2` - make from block Heading 2
-   `tune.h3` - make from block Heading 3
-   `tune.h4` - make from block Heading 4
-   `tune.h5` - make from block Heading 5
-   `tune.h6` - make from block Heading 6

Also you can use any buttons provided by other plugins:

```js
Jodit.make('#editor2', {
	tuneBlock: {
		popup: {
			table: Jodit.atom(['brush', 'image', 'align'])
		}
	}
});
```

And of course you can add your own button, just like this [done for the main toolbar](https://xdsoft.net/jodit/pro/docs/how-to/add-custom-button.md)

```js
Jodit.make('#editor2', {
	tuneBlock: {
		popup: {
			table: [
				{
					icon: 'brush',
					name: 'Brush table in red',
					exec(editor, tableElm) {
						tableElm.querySelectorAll('td').forEach((td) => {
							td.style.backgroundColor = 'red';
						});

            editor.e.fire('afterExecTune.tune'); // close the tuner
					}
				}
			]
		}
	}
});
```

## Disabling a plugin

In order to deactivate a plugin, you can set:

```jsx
import JoditEditor from 'jodit-react';

<JoditEditor config={{ disablePlugins: ['tune-block'] }} />;
```

If you want to deactivate the plugin for any one type of tags, then simply set its value to null.

```js
Jodit.make('#editor3', {
	tuneBlock: {
		popup: {
			h3: null // No tune-block will be shown for H3 tag
		}
	}
});
```

Alternatively, you can disable the plugin for all tags by simply specifying:

```js
Jodit.make('#editor3', {
	tuneBlock: {
		popup: Jodit.atom({}) // We erase all default values
	}
});
```
