# Translate plugin

When you use a `translate` plugin, you can change the language settings on the fly right from the `translate` toolbar buttons.
But their defaults, the translation engine and its API key need to be set in the configuration panel.

## Options

### translate.provider

-   Type: 'google' | `ITranslateProviderFactory`
-   Default: ''
-   Required: true

Translation engine. You can use any of the following:

-   `google` - Google Translate API
-   You can define your own translation provider that implements the interface `ITranslateProviderFactory`. [Example](##custom-translate-provider)

### translate.defaultSourceLang

Default source language. Use a language [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) codes.
The default language is determined from the `Jodit.defaultOptions.language` settings.

-   Type: `String`
-   Default: 'auto'
-   Required: `true`

### translate.defaultTargetLang

Default target language. Use a language [ISO-639-1](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) codes.

-   Type: `String`
-   Default: 'de'
-   Required: true

### translate.googleProviderOptions

-   Type: `IGoogleTranslateProviderOptions`
-   Default: {}
-   Required: `false`

Options for Google Translate API

#### translate.googleProviderOptions.key

-   Type: `String`
-   Default: ''
-   Required: `true`

API key for using Google Translate engine. [Get API key](https://cloud.google.com/console/)

## Custom translate provider

Use your own translation provider. You must provide a function that returns an object with a `translate` method that must return `Promise<ITranslateResponse>`

```ts
interface ITranslateResponse {
	text: string;
}
```

And a method that returns a list of supported languages

```ts
interface ITranslateSupportedLanguages {
	langs: {
		[title: string]: string;
	};
}
```

```js
import { JoditPro } from 'jodit-pro';
JoditPro.make('#editor', {
	language: 'en',
	buttons: ['translate.translate'],
	extraPlugins: ['translate'],
	translate: {
		provider: (jodit) => {
			return {
				supportedLanguages() {
					return Promise.resolve({
						langs: {
							English: 'en',
							Russian: 'ru',
							German: 'de'
						}
					});
				},
				translate(text, from, to) {
					return fetch(
						'https://your-translate-service.com/?text=' +
							encodeURIComponent(text) +
							'&from=' +
							encodeURIComponent(from || jodit.o.language) +
							'&to=' +
							encodeURIComponent(to)
					)
						.then((resp) => resp.json())
						.then((data) => {
							text: data.translation.text;
						});
				}
			};
		}
	}
});
```

## Installation

```html
<!DOCTYPE html>
<html>
	<head>
		<title>Translate Editor</title>
		<meta charset="utf-8" />

		<!-- css -->
		<link
			rel="stylesheet"
			href="./node_modules/jodit-pro/build/jodit.css"
		/>
		<link
			rel="stylesheet"
			href="./node_modules/jodit-pro/build/plugins/translate/translate.css"
		/>
	</head>
	<body>
		<!-- element -->
		<textarea id="entry">...</textarea>

		<!-- js -->
		<script src="./node_modules/jodit-pro/build/jodit.js"></script>
		<script src="./node_modules/jodit-pro/build/config.js"></script>
		<script src="./node_modules/jodit-pro/build/plugins/translate/translate.js"></script>

		<!-- call -->
		<script>
			Jodit.make('#entry', {
				extraPlugins: ['translate'],
				translate: {
					provider: 'google',
					googleProviderOptions: {
						key: '{YOUR_GOOGLE_API_KEY}'
					}
				}
			});
		</script>
	</body>
</html>
```

## Example

Use `google` translate provider.

```js
import { JoditPro } from 'jodit-pro';
JoditPro.make('#editor', {
	language: 'en',
	buttons: ['translate.translate'],
	extraPlugins: ['translate'],
	translate: {
		provider: 'google',
		googleProviderOptions: {
			key: '{YOUR_GOOGLE_API_KEY}'
		}
	}
});
```
