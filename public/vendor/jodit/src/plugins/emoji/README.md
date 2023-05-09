# Emoji plugin 😀😀😀

This plugin introduces support for easy inserting of emoji characters in a unified, platform-independent way. Emojis are inserted by typing codes based on Unicode Short Names in the editor or by opening the emoji dropdown with a toolbar button.

The emoji dropdown allows you to filter the list, navigate by category or search for relevant emoji.

Keyword matching functionality ensures that when you are looking for a term (such as "doctor"), related matches (like ":face_with_medical_mask:", ":man_health_worker:", ":woman_health_worker:", ":hospital:" or ":pill") will be displayed, too.

The Emoji plugin that provides this functionality is an implementation of the Autocomplete feature. It includes an autocomplete component that will list available emojis after the user types the colon character (":") in the editor content.

## Parse

By default, emoji list loaded from `https://raw.githubusercontent.com/github/gemoji/master/db/emoji.json` and postprocess it.
You can run `node utils/parse.js` file and get the latest version of it.

## Options

```js
Jodit.make('#editor', {
	emoji: {
		enableAutoComplete: true, // start with : to insert a Unicode emoji character. Type at least 2 characters e.g. :fa
		recentCountLimit: 100, // show last 100 choosen emojis (default  10)
		data: () => ({
			categories: ['Smileys & Emotion'],
			emoji: [
				{
					e: '😀',
					d: 'grinning face',
					c: 0,
					a: ['grinning'],
					t: ['smile', 'happy']
				},
				{
					e: '😃',
					d: 'grinning face with big eyes',
					c: 0,
					a: ['smiley'],
					t: ['happy', 'joy', 'haha']
				}
			]
		})
	}
});
```

or use remote source

```js
Jodit.make('#editor', {
	emoji: {
		data: () =>
			fetch('https://some.com/emoji.json').then((res) => res.json())
	}
});
```
