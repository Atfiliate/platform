/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import './button.less';

import type { IDictionary } from 'jodit/types';
import { UIElement } from 'jodit/core/ui';
import { css } from 'jodit/core/helpers';
import { component, watch } from 'jodit/core/decorators';
import { isString } from 'jodit/core/helpers/checker';
import { assert } from 'jodit/src/core/helpers';

@component
export class UIGButton extends UIElement {
	/** @override */
	override className(): string {
		return 'UIGButton';
	}

	/** @override */
	constructor(jodit: UIElement['jodit'], protected style: IDictionary) {
		super(jodit);
	}

	@watch('style')
	private updateStyles(): void {
		const { style } = this;
		const btn = this.getElm('button');

		assert(btn != null, 'button element does not exist');

		const wrapper = this.getElm('wrapper');

		assert(wrapper != null, 'wrapper element does not exist');
		wrapper.style.backgroundColor = style.previewBgColor;

		UIGButton.applyStyle(style, btn);
	}

	static applyStyle(style: IDictionary, btn: HTMLElement): void {
		const _ = (v: string | number): string => (isString(v) ? v : v + 'px');

		btn.innerText = style.text || 'css';
		btn.setAttribute('href', style.href);

		css(btn, {
			background: !style.solid
				? `linear-gradient(to bottom, ${style.bgStart} 5%, ${style.bgEnd} 100%)`
				: null,
			backgroundColor: style.bgStart,
			borderRadius: _(style.borderRadius),
			border: `${_(style.borderSize)} solid ${style.borderColor}`,
			display: 'inline-block',
			cursor: 'pointer',
			color: style.fontColor,
			fontFamily: style.fontFamily,
			fontSize: _(style.fontSize),
			fontWeight: style.fontWeight ? 'bold' : null,
			fontStyle: style.fontItalic ? 'italic' : null,
			padding: `${_(style.paddingY)} ${_(style.paddingX)}`,
			textDecoration: 'none'
		});

		css(btn, {
			textShadow: style.textShadow
				? [
						style.textShadowOffsetX,
						style.textShadowOffsetY,
						style.textShadowBlurRadius,
						style.textShadowColor
				  ]
						.map(_)
						.join(' ')
				: null
		});

		css(btn, {
			boxShadow: style.boxShadow
				? [
						style.boxShadowInset ? 'inset' : '',
						style.boxShadowOffsetX,
						style.boxShadowOffsetY,
						style.boxShadowBlurRadius,
						style.boxShadowSpreadRadius,
						style.boxShadowColor
				  ]
						.map(_)
						.join(' ')
				: null
		});
	}

	override update(): void {
		this.updateStyles();
	}

	/** @override */
	protected override render(): string {
		return `<div>
			<div class='&__wrapper'>
				<button class='&__button'>css</button>
			</div>
		</div>`;
	}

	static extractStyle(
		state: IDictionary,
		target: HTMLButtonElement | HTMLAnchorElement
	): void {
		const style =
			target.ownerDocument.defaultView?.getComputedStyle(target) ||
			({} as CSSStyleDeclaration);

		const extractColors = (): IDictionary => {
			const result: IDictionary = {
				solid: true,
				bgStart: style.backgroundColor ?? '#44c767',
				bgEnd: style.backgroundColor ?? '#44c767'
			};

			const img = style.backgroundImage;

			if (img && /linear-gradient/.test(img)) {
				const colors =
					/linear-gradient\((.+)\s+[0-9]+%,\s+(.+)\s+[0-9]+%\)/.exec(
						img
					);

				if (colors) {
					result.solid = false;
					result.bgStart = colors[1] || result.bgStart;
					result.bgEnd = colors[2] || '#5cbf2a';
				}
			}

			return result;
		};

		const extractShadow = (
			order: string[],
			result: IDictionary,
			keyEnable: 'boxShadow' | 'textShadow',
			keyColor: string
		): IDictionary => {
			const boxShadow = style[keyEnable];

			if (
				!boxShadow ||
				['none', 'inherit', 'initial', 'unset'].includes(boxShadow)
			) {
				return {
					[keyEnable]: false
				};
			}

			const components = boxShadow.replace(/,\s/g, ',').split(/\s+/);

			components.forEach((part) => {
				if (/[0-9.]+(px|pt|em|%)/.test(part)) {
					const key = order.shift();

					if (key) {
						result[key] = part;
					}
				} else if (part === 'inset') {
					result.boxShadowInset = true;
				} else {
					result[keyColor] = part;
				}
			});

			result[keyEnable] = true;

			return result;
		};

		Object.assign(state, {
			text: target.innerText,
			className: target.className,
			href: target.getAttribute('href') || '',

			...extractColors(),

			borderColor: style?.borderColor ?? '#18ab29',
			borderRadius: style?.borderRadius ?? 0,
			borderSize: style?.borderWidth ?? 1,

			...extractShadow(
				[
					'boxShadowOffsetX',
					'boxShadowOffsetY',
					'boxShadowBlurRadius',
					'boxShadowSpreadRadius'
				],
				{
					boxShadowBlurRadius: 0,
					boxShadowColor: '#3dc21b',
					boxShadowInset: false,
					boxShadowOffsetX: 0,
					boxShadowOffsetY: 0,
					boxShadowSpreadRadius: 0
				},
				'boxShadow',
				'boxShadowColor'
			),

			fontColor: style.color,
			fontFamily: style.fontFamily,
			fontSize: style.fontSize,

			fontWeight: style.fontWeight === 'bold',
			fontItalic: style.fontStyle === 'italic',

			paddingX: style.paddingLeft,
			paddingY: style.paddingTop,

			...extractShadow(
				[
					'textShadowOffsetX',
					'textShadowOffsetY',
					'textShadowBlurRadius'
				],
				{
					textShadowBlurRadius: 0,
					textShadowColor: '#2f6627',
					textShadowOffsetX: 0,
					textShadowOffsetY: 1
				},
				'textShadow',
				'textShadowColor'
			)
		});
	}
}
