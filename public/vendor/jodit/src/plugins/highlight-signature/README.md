# Plugin for highlighting sections of text

Designed to highlight a part of the text with a certain template.
The plugin settings are very simple, you define a regular expression, finding which, the plugin will replace it with the function result.

## Options

```ts
interface highlightSignature: {
  schema: IDictionary<
    (jodit: IJodit, matches: RegExpMatchArray) => HTMLElement
  >;
};
```

But this temporary element will not get into the final HTMl.

## Example 1

For example, we need to highlight email addresses everywhere:

```js
const editor = Jodit.make('#editor', {
	highlightSignature: {
		schema: {
			'[^\\s]+@[a-z.-]+': (jodit) =>
				jodit.createInside.element('strong')
		}
	}
});

editor.value = '<p>Hi Valery chupurnov@gmail.om</p>';
console.log(editor.value); // '<p>Hi Valery chupurnov@gmail.om</p>'
console.log(editor.getNativeEditorValue()); // '<p>Hi Valery <strong data-jodit="temp">chupurnov@gmail.om</strong></p>'
```

The final value does not change. And in the original `textarea` the value not wrapped in the `strong` tag will be saved.

## Example 2

Now let's highlight something else. Let us have macros `${formSubmittedDate}`, `${formSessionURL}` which
need to be highlighted with different background color.

```js
const editor = Jodit.make('#editor', {
	highlightSignature: {
		schema: {
			'\\$\\{([^}]+)\\}': (jodit, matched) => {
				let color = 'yellow'; // all another macros will be `yellow`

				switch (matched[1]) {
					case 'formSubmittedDate':
						color = 'red';
						break;

					case 'formSessionURL':
						color = '#0f0';
						break;
				}

				const span = jodit.createInside.element('span', {
					style: {
						backgroundColor: color
          }
        });

				return span;
			}
		}
	}
});

editor.value = '<p>The text ${formSubmittedDate} and ${formSessionURL} has some styling/decoration around it.</p>';
console.log(editor.value); // '<p>The text ${formSubmittedDate} and ${formSessionURL} has some styling/decoration around it.</p>'
console.log(editor.element.value); // '<p>The text ${formSubmittedDate} and ${formSessionURL} has some styling/decoration around it.</p>'
console.log(editor.getNativeEditorValue()); // '<p>The text <span data-jodit="temp" style="background-color:red">${formSubmittedDate}</span> and <span data-jodit="temp" style="background-color:#0f0">${formSessionURL}</span> has some styling/decoration around it.</p>'
console.log(editor.editor.innerHTML === editor.getNativeEditorValue()); // true
```


