/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './resize.less';

import type { CallbackFunction, IPointBound, IUIElement } from 'jodit/types';
import { css } from 'jodit/core/helpers/utils/css';
import { Dom } from 'jodit/core/dom/dom';

type IDirection = 'right' | 'left' | 'top' | 'bottom';

interface IDirectionBound extends IPointBound {
	direction: IDirection;
}

export abstract class UIResize {
	static remove(element: UIResize & IUIElement): void {
		css(element.container, {
			width: null,
			height: null
		});
		element.container.classList.remove('jodit-ui-resize');
		Dom.safeRemove(
			element.container.querySelector('.jodit-ui-resize__handle')
		);
	}

	static install(
		element: UIResize & IUIElement,
		direction: IDirection
	): void {
		element.container.classList.add('jodit-ui-resize');

		if (css(element.container, 'position') === 'static') {
			css(element.container, 'position', 'relative');
		}

		const handle = element.j.c.div('jodit-ui-resize__handle');
		handle.classList.add('jodit-ui-resize__handle_type_' + direction);
		element.container.appendChild(handle);

		element.j.e.on(
			handle,
			'mousedown touchstart',
			this.onStartResize.bind(this, element, direction)
		);
	}

	private static onStartResize(
		element: UIResize & IUIElement,
		direction: IDirection,
		e: MouseEvent
	): void {
		const start: IDirectionBound = {
				x: e.clientX,
				y: e.clientY,
				w: element.container.offsetWidth,
				h: element.container.offsetHeight,
				direction
			},
			onResize = element.j.async.throttle(
				this.onResize.bind(this, element, start),
				element.j.defaultTimeout / 10
			);

		element.j.lock();

		element.j.e
			.on(element.j.ow, 'mousemove touchmove', onResize)
			.one(
				element.j.ow,
				'mouseup touchend',
				this.onEndResize.bind(this, element, onResize)
			);
	}

	private static onResize(
		element: UIResize & IUIElement,
		start: IDirectionBound,
		e: MouseEvent
	): void {
		const byWidth = ['left', 'right'].includes(start.direction),
			parentElement = element.container.parentElement;

		if (!parentElement) {
			return;
		}

		let diff;

		if (byWidth) {
			diff =
				(start.w +
					(e.clientX - start.x) *
						(start.direction === 'right' ? 1 : -1)) /
				parentElement.offsetWidth;
		} else {
			diff =
				(start.h +
					(e.clientY - start.y) *
						(start.direction === 'top' ? 1 : -1)) /
				parentElement.offsetHeight;
		}

		css(element.container, byWidth ? 'width' : 'height', diff * 100 + '%');
	}

	private static onEndResize(
		element: UIResize & IUIElement,
		onResize: CallbackFunction,
		_: MouseEvent
	): void {
		element.j.e.off(element.j.ow, 'mousemove touchmove', onResize);
		element.j.unlock();
	}

	abstract addResize(): void;
}
