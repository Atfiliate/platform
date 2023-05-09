/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './select-items.less';

import type {
	CallbackFunction,
	IBound,
	IDictionary,
	IPointBound,
	IUIElement
} from 'jodit/types';
import { Dom } from 'jodit/core/dom/dom';
import { css } from 'jodit/core/helpers/utils/css';

export abstract class UISelectItems {
	static remove(element: UISelectItems & IUIElement): void {
		Dom.safeRemove(
			element.container.querySelector('.jodit-ui-select-items')
		);

		element.j.e.off(
			element.container,
			'mousedown.uiselectitems touchstart.uiselectitems'
		);
	}

	static install(element: UISelectItems & IUIElement): void {
		const bound = element.j.c.div('jodit-ui-select-items');

		element.j.e.on(
			element.container,
			'mousedown.uiselectitems touchstart.uiselectitems',
			this.onStartSelect.bind(this, element, bound)
		);
	}

	private static onStartSelect(
		element: UISelectItems & IUIElement,
		bound: HTMLElement,
		e: MouseEvent
	): void {
		if (e.target !== element.container) {
			return;
		}

		css(bound, { width: 0, height: 0 });
		element.container.appendChild(bound);

		const start: IPointBound = {
				x: e.clientX,
				y: e.clientY,
				w: element.container.offsetWidth,
				h: element.container.offsetHeight
			},
			onSelect = element.j.async.throttle(
				this.onSelect.bind(this, element, bound, start),
				element.j.defaultTimeout / 10
			);

		element.j.lock();

		element.j.e
			.on(element.j.ow, 'mousemove touchmove', onSelect)
			.one(
				element.j.ow,
				'mouseup touchend',
				this.onEndSelect.bind(this, element, bound, onSelect)
			);

		element.onSelectItems({
			left: start.x,
			top: start.y,
			width: 0,
			height: 0
		});
	}

	private static onSelect(
		element: UISelectItems & IUIElement,
		bound: HTMLElement,
		start: IPointBound,
		e: MouseEvent
	): void {
		const left: number = start.x > e.clientX ? e.clientX : start.x;
		const top: number = start.y > e.clientY ? e.clientY : start.y;

		const selectBound: IBound = {
			left,
			top,
			width: Math.abs(start.x - e.clientX),
			height: Math.abs(start.y - e.clientY)
		};

		css(bound, selectBound as IDictionary);

		element.onSelectItems(selectBound);
	}

	private static onEndSelect(
		element: UISelectItems & IUIElement,
		bound: HTMLElement,
		onResize: CallbackFunction,
		_: MouseEvent
	): void {
		Dom.safeRemove(bound);
		element.j.e.off(element.j.ow, 'mousemove touchmove', onResize);
		element.j.unlock();
	}

	abstract addItemsSelector(): void;
	abstract onSelectItems(bound: IBound): void;
}
