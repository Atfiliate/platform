# Virtual Keyboard plugin

Allows you to open the virtual keyboard and enter data using the mouse.

It also allows you to set a series of buttons with hot keys, which will enter the character specified for them. Can be
used for languages that do not have a proper keyboard.

### Example

```html
<textarea id="editor1"></textarea>
<script>
	const editor = Jodit.make('#editor1', {
		buttons: [
			'keyboard',
			{
				group: 'custom',
				buttons: []
			}
		]
		keyboard: {
			extraKeyGroup: 'custom',
			extraKeyButtons: [
				{
					key: 'λ',
					hotkey: 'ctrl+1'
				},
				'β' // Will have hotkey alt+2
			]
		}
	});

	editor.execCommand('toggleKeyboard'); // Show virtual keyboard
	editor.execCommand('toggleKeyboard'); // Hide virtual keyboard
</script>
```

## Options

#### layoutList

Dictionary of language keyboard layouts of the form:

```ts
interface ILayoutKeys {
	title: string;
	keys: string[][];
}
```

Where characters are separated by a space

-   First character by default
-   The second one when you press the Shift button
-   Third when you click the Options button

##### Example

```html
<textarea id="editor2"></textarea>
<script>
	const editor = Jodit.make('#editor2', {
		keyboard: {
			defaultLayoutSet: 'ru',
			layoutList: {
				tata: {
					title: 'Russian language',
					// prettier-ignore
					key: [
						['` ~ ±', '1 ! §', '2 @ "', '3 # :', '4 $ <', '5 % >', '6 ^', '7 &', '8 *', '9 (', '0 )', '- _', '= +', 'Backspace'],
						['Tab', 'й Й', 'ц Ц', 'у У', 'к К', 'е Е', 'н Н', 'г Г', 'ш Ш', 'щ Щ', 'з З', 'х Х [', 'ъ ] {', '\\ | }'],
						['Caps', 'ф Ф', 'ы Ы', 'в В', 'а А', 'п П', 'р Р', 'о О', 'л Л', 'д Д', 'ж Ж ;', 'э Э \'', 'Enter'],
						['Shift', 'я Я', 'ч Ч', 'с С', 'м М', 'и И', 'т Т', 'ь Ь', 'б Б ,', 'ю Ю .', '/ ?', 'Shift'],
						['Options', 'Space', 'Options'],
					]
					// prettier-ignore-end
				}
			}
		}
	});
</script>
```

#### defaultLayoutSet (default 'en')

Set layout language by default.

##### Example

```html
<textarea id="editor2"></textarea>
<script>
	const editor = Jodit.make('#editor2', {
		keyboard: {
			defaultLayoutSet: 'ru'
		}
	});
</script>
```

#### showLayoutSwitcher (default: true)

Show keyboard layout selection buttons in the header of the virtual keyboard.

#### layoutSwitchList (default: ['en', 'es', 'de', 'ru', 'tr', 'iw', 'tata'])

##### Example

```html
<textarea id="editor3"></textarea>
<script>
	const editor = Jodit.make('#editor3', {
		keyboard: {
			layoutSwitchList: ['ru', 'tata'],
			defaultLayoutSet: 'tata'
		}
	});
</script>
```
