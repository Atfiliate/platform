# Paste sample code plugin

Insert and embed syntax highlighted code snippets.

The Paste Code Sample (pasteCode) plugin allows the user to paste and embed syntax-highlighted code snippets into an editable area.
It also adds a button to the toolbar that, when clicked, opens a dialog box for entering raw code.

## Installation:

Add "pasteCode" to your Jodit's extraPlugins variable

```js
Jodit.make('#editor', {
	extraPlugins: ['pasteCode']
});
```

## Options

### globalHighlightLib

-   Type: Boolean
-   Default: false

This config option allows you to use the global version of `Prism.js`(or another highlight library) when highlighting code sample blocks,
instead of using the `Prism.js` version built into the` paste-code` plugin.
This allows a special version of `Prism.js` to be used, including additional languages.

When using this option, make sure that `Prism.js` and any language add-ons are loaded to the site along with the Jodit script:

```html
<textarea id="editor"></textarea>
<script
	src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/prism.min.js"
	data-manual
></script>
<script>
	Jodit.make('#editor', {
		pasteCode: {
			globalHighlightLib: true
		}
	});
</script>
```

### highlightLib

-   Type:

```ts
interface highlightLib {
	highlight: (code: string, language: string) => string;
	isLangLoaded: (lang: string) => boolean;
	langUrl: (lang: string) => string;
	js: string[];
	css: string[];
}
```

-   Default:

```js
highlightLib = {
	js: ['https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/prism.min.js'],

	isLangLoaded(lang) {
		return Boolean(Prism.languages[lang]);
	},

	langUrl: (lang) =>
		`https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/components/prism-${lang}.min.js`,

	css: [
		'https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/themes/prism.min.css'
	],

	highlight: (code, language) => {
		return Prism.highlight(
			code,
			Prism.languages[language] || Prism.languages.plain,
			language
		);
	}
};
```

In contrast to `globalHighlightLib`, the Jodit editor itself includes the styles and scripts of` prism.js`( or another lib.).

#### highlightLib.js

-   Type: String[]
-   Default: `['https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/prism.min.js']`

The `js` field lists the scripts that need to be loaded for syntax highlighting.
You can specify multiple languages here.

For example:

```js
Jodit.make('#editor', {
	pasteCode: {
		highlightLib: {
			js: [
				'https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/prism.min.js',
				'https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/components/prism-csv.min.js'
			]
		}
	}
});
```

#### highlightLib.css

-   Type: String[]
-   Default: `['https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/themes/prism.min.css']`

The `css` field lists the styles that need to be loaded for syntax highlighting.
You can specify a different theme here.

For example:

```js
Jodit.make('#editor', {
	pasteCode: {
		highlightLib: {
			css: [
				'https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/themes/prism-twilight.min.css'
			]
		}
	}
});
```

#### highlightLib.langUrl

-   Type: Function
-   Default:

```typescript
function langUrl(lang: string): string {
	return `https://cdnjs.cloudflare.com/ajax/libs/prism/1.25.0/components/prism-${lang}.min.js`;
}
```

The Prism.JS(or another lib) init script only highlights a limited number of languages. If a language is selected that has not yet been loaded,
Jodit will find it from the URL that this function generates.

For example:

```js
Jodit.make('#editor', {
	pasteCode: {
		highlightLib: {
			langUrl: (lang) =>
				`https://cdnjs.cloudflare.com/ajax/libs/prism/1.1.0/components/prism-${lang}.js`
		}
	}
});
```

#### highlightLib.isLangLoaded

-   Type: Function
-   Default:

```js
function isLangLoaded(lang) {
	return Boolean(Prism.languages[lang]);
}
```

Determines whether the language handler needs to be loaded, or it has already been loaded earlier

#### highlightLib.highlight

-   Type: Function
-   Default:

```js
function highlight(code, language) {
	return Prism.highlight(
		code,
		Prism.languages[language] || Prism.languages.plain,
		language
	);
}
```

The main method of the syntax highlighting library that generates a string in which language tokens are replaced with span blocks.
This method can be replaced with another one.
Only in it, the call of the highlighting library is defined.

Therefore, you can use another library with this plugin.
For example, let's use another popular library for syntax highlighting [highlight.js](https://highlightjs.org/)

```js
Jodit.make('#editor', {
	pasteCode: {
		insertTemplate: (jodit, language, value) =>
			`<pre><code class="hljs language-${language}">${Jodit.modules.Helpers.htmlspecialchars(value)}</code></pre>`,

		highlightLib: {
			js: [
				'//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/highlight.min.js'
			],

			isLangLoaded(lang) {
				if (lang === 'html') {
					return true;
				}
				return Boolean(hljs.listLanguages()[lang]);
			},

			langUrl: (lang) =>
				`//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/languages/${lang}.min.js`,

			css: [
				'//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.3.1/styles/default.min.css',
			],

			highlight: (code, language) => {
				return hljs.highlight(code, { language: language }).value;
			}
	}
});
```

### defaultLanguage

-   Type: String
-   Default: 'html'

-   Specifies the default language in which the code editor will open.

### canonicalLanguageCode

-   Type:

```ts
function canonicalLanguageCode(lang: string): string {
	...
}
```

-   Default:

```ts
function canonicalLanguageCode(lang: string): string {
	switch (lang) {
		case 'ts':
			return 'typescript';

		case 'js':
			return 'javascript';

		case 'markup':
			return 'html';
	}
	return lang;
}
```

Specifies the canonical names of languages

### insertTemplate

-   Type: Function
-   Default:

```ts
function (jodit: IJodit, language: string, value: string) {
	return `<pre class="language-${language}">${Jodit.modules.Helpers.htmlspecialchars(
		value
	)}</pre>`
}
```

-   Signature:

```ts
interface insertTemplate {
	(
    jodit: IJodit,
    language: string,
    value: string
  ) => string;
}
```

Allows you to specify a function that generates the string to be inserted.

### languages

-   Type: `Array<{value: string, text: string}>`
-   Default:

```js
[
	{ value: 'html', text: 'HTML/XML' },
	{ value: 'javascript', text: 'JavaScript' },
	{ value: 'css', text: 'CSS' },
	{ value: 'php', text: 'PHP' },
	{ value: 'ruby', text: 'Ruby' },
	{ value: 'python', text: 'Python' },
	{ value: 'java', text: 'Java' },
	{ value: 'c', text: 'C' },
	{ value: 'csharp', text: 'C#' },
	{ value: 'cpp', text: 'C++' }
];
```

This configuration option enables you to set a list of languages to be displayed in the languages drop down.

### dialog

#### width

#### height

Allow set dialog size.

## Example

```js
Jodit.make('#editor', {
	pasteCode: {
		defaultLanguage: 'js',

		languages: Jodit.atom([
			{ value: 'js', text: 'JS' },
			{ value: 'css', text: 'CSS' }
		]),

		insertTemplate: (_, lang, value) => `<code>${value}</code>`,

		dialog: {
			width: 1000
		}
	}
});
```
