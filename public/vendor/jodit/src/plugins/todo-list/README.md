# Todo list plugin for Jodit

This plugin adds a button to the toolbar that allows you to insert a list of tasks.

By default, the plugin generates the following structure

```html
<ul class="todo-list">
	<li>
		<label class="todo-list__label" contenteditable="false">
			<input tabindex="-1" type="checkbox" /> </label
		>point
	</li>
</ul>
```

But this can be customized with options:

## Options

```ts
interface Config {
	todoList: {
		className: string;
		labelClassName: string;
		inputFactory: (jodit: IJodit) => HTMLElement;
	};
}
```

```js
const editor = Jodit.make({
	todoList: {
		className: 'list1',
		labelClassName: 'list1_label1',
		inputFactory: (j) => {
			return j.createInside.element('span', {
				class: 'checkbox'
			});
		}
	}
});
```

## Styles

You can also use css properties for customization:

```html
<style>
	:root {
		--jd-todo-color-checkbox-border: #333;
		--jd-todo-color-checkbox-border-checked: #25ab33;
		--jd-todo-color-checkbox-bg-checked: #25ab33;
		--jd-todo-color-checkbox-mark-checked: #fff;
		--jd-todo-size-checkbox: 18px;
	}
</style>
```
