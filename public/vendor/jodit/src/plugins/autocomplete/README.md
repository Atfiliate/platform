# Autocomplete

The plugin allows you to set search feeds so that when typing, a query occurs in them, and if there are results, they are displayed in a pop-up window.
In the window using the keyboard, you can navigate up and down. You can select the desired item either with the mouse, or by pressing tab or Enter.

Search feeds can be either simple arrays of strings, simple functions that return arrays of strings, or go to the server and return a Promise.

### Simple example is mentioning employees

```js
const names = [
	'@mary',
	'@jain',
	'@entany',
	'@isaak',
	'@ivan',
	'@fedya',
	'@yakov',
	'@jhon',
	'@lena',
	'@elvin'
];

Jodit.make('#editor', {
	autocomplete: {
		sources: [names]
	}
});
```

A more complex case of going to the server is also possible:

```js
Jodit.make('#editor', {
	autocomplete: {
		sources: [
			// Async feed as AutoCompleteCallback<IAutoCompleteItem>
			async (query) =>
				fetch('./mention.php?q=' + encodeURIComponent(query)).then(
					(resp) => resp.json()
				)
		]
	}
});
```

The plugin can accept several sources of information for autocomplete:

```js
const names = [
	'@mary',
	'@jain',
	'@entany',
	'@isaak',
	'@ivan',
	'@fedya',
	'@yakov',
	'@jhon',
	'@lena',
	'@elvin'
];

Jodit.make('#editor', {
	autocomplete: {
		sources: [
			['wysiwyg', 'editor', 'rich', 'jodit'], // Frist feed as string[]
			[{ value: 'Scrooge McDuck' }, { value: 'Dewey Duck' }], // Second feed as IAutoCompleteItem[]

			// Sync feed as AutoCompleteCallback<IAutoCompleteItem>
			(query) =>
				names
					.filter((value) => value.indexOf(query) === 0)
					.map((value) => ({
						title: value,
						value
					})),

			// Async feed as AutoCompleteCallback<IAutoCompleteItem>
			async (query) =>
				fetch('./mention.php?q=' + query).then((resp) => resp.json())
		]
	}
});
```

## Options

### sources

-   Type: Array
-   Default: []

These are all feeds available to the plugin. When entering text, it will poll them and display the result, if any.
The source can be either a simple array, or a function that returns an array. In either case, a value in the form of a Promise is possible.
Also, an object with the `feed` field can be specified as a source.

For example, let's make a mention of everyone's favorite characters from the Friends series.

```js
const friends = [
	{
		id: '@Rachel',
		userId: '1',
		name: 'Rachel Green',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0000098'
	},
	{
		id: '@Chandler',
		userId: '2',
		name: 'Chandler Bing',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001612'
	},
	{
		id: '@Monica',
		userId: '3',
		name: 'Monica Geller',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001073'
	},
	{
		id: '@Ross',
		userId: '4',
		name: 'Dr. Ross Geller',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001710'
	},
	{
		id: '@Phoebe',
		userId: '5',
		name: 'Phoebe Buffay',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001435'
	},
	{
		id: '@Ursula',
		userId: '6',
		name: 'Ursula Buffay',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001435'
	},
	{
		id: '@Joey',
		userId: '7',
		name: 'Joey Tribbiani',
		link: 'https://www.imdb.com/title/tt0108778/characters/nm0001455'
	}
];

Jodit.make('#editor', {
	autocomplete: {
		sources: [
			// Feed as IAutoCompleteCustomFeed<IDictionary>
			{
				feed: (query) =>
					friends.filter(
						(value) =>
							value.id.indexOf(query) === 0 ||
							value.name.indexOf(query) === 1
					),
				itemRenderer: (item) => `${item.id} (${item.name})`,
				insertValueRenderer: ({ id, userId, name, link }) =>
					`<a class="mention" data-mention="${id}" data-user-id="${userId}" href="${link}">${name}</a>`
			}
		]
	}
});
```

> Please note that we also set the way to display items in the list, as well as how it will be inserted into the editor when selected.

### itemRenderer

-   Type: Function
-   Default: `(item) => item.title ?? item.value`

This function takes your list item as input and returns either a string or a ready-made HTML item to display in the list.

The function has the following signature:

```typescript
interface itemRenderer {
  (item: T) => string | HTMLElement;
}
```

In the example above, we set it right in the feed.
However, you can define your own function for the entire plugin and all feeds.

```js
Jodit.make('#editor', {
	autocomplete: {
		itemRenderer: (item) => `<span>${item.id} (${item.name})</span>`,

		sources: [
			// feeds ...
		]
	}
});
```

### insertValueRenderer

-   Type: Function
-   Default: `(item) => item.value + '&nbsp;'`

The function formats the result to be inserted into the editor. You are free to transform the selected value as desired.

The function has a signature similar to `itemRenderer` and can also return a ready-made` HTMLElement`;

```typescript
interface insertValueRenderer {
  (item: T) => string | HTMLElement;
}
```

```js
Jodit.make('#editor', {
	autocomplete: {
		insertValueRenderer: (item) => {
			const a = document.createElement('a');

			a.href = item.link;
			a.innerText = item.name;

			return a;
		},

		sources: [
			// feeds ...
		]
	}
});
```

### maxItems

-   Type: Number
-   Default: 50

The maximum number of items that the autocomplete list will display.

### isMatchedQuery

-   Type: Function
-   Default: `(query, value) => value.toLowerCase().indexOf(query.toLowerCase()) === 0`

For cases where feed is specified as a regular array, this method allows you to describe the search for matches in it.

```js
const names = [
	'@mary',
	'@jain',
	'@entany',
	'@isaak',
	'@ivan',
	'@fedya',
	'@yakov',
	'@jhon',
	'@lena',
	'@elvin'
];

Jodit.make('#editor', {
	autocomplete: {
		isMatchedQuery: (q, value) => {
			value = value.substr(1);

			return value.toLocaleUpperCase().includes(q.toLocaleUpperCase()); // Full text search
		},

		ources: [names]
	}
});
```

## Events

### autocomplete

Run query checked and return array of matched items.

```js
const editor = Jodit.make('#editor');
const items = editor.events.fire('autocomplete', 'some query');
console.log(items); // all found results
```

### select.autocomplete

Fired on item selection by keyboard or by mouse.

```js
const editor = Jodit.make('#editor');
editor.events.on('select.autocomplete', (selectedItem) => {
	cosnole.log(selectedItem);
});
```

### registerAutocompleteSource

The main event for registering your own autocomplete sources.

```js
const editor = Jodit.make('#editor');

await editor.waitForReady(); // Because plugin Autocomplete can be loaded asynchronously

const languages = [
	'ActionScript',
	'AppleScript',
	'Asp',
	'BASIC',
	'Erlang',
	'Fortran',
	'Haskell',
	'Java',
	'JavaScript',
	'Scala'
];

editor.events.fire('registerAutocompleteSource', (query) =>
	languages
		.filter((value) => value.indexOf(query) === 0)
		.map((value) => ({
			title: value,
			value
		}))
);
```
