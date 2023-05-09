/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import './form.less';

import type { IDictionary, IUIInput } from 'jodit/types';
import { UIElement, UIInput, UISelect } from 'jodit/core/ui';
import { toArray } from 'jodit/core/helpers/array/to-array';
import { Dom } from 'jodit/core/dom/dom';
import { UIRange } from '../../../../core/ui/form/range/range';
import { assert } from 'jodit/core/helpers/utils/assert';

export class UIFormButtonGenerator extends UIElement {
	/** @override */
	override className(): string {
		return 'UIFormButtonGenerator';
	}

	/** @override */
	constructor(
		jodit: UIElement['jodit'],
		readonly state: IDictionary,
		readonly updateState: (
			name: string,
			value: boolean | string | number
		) => void
	) {
		super(jodit);

		const getOnUpdate =
			(uiInput: IUIInput, input: HTMLInputElement | HTMLSelectElement) =>
			(): void => {
				let newValue = this.state[input.name];

				if (/px/.test(newValue.toString())) {
					newValue = newValue.toString().replace(/px/, '');
				}

				if (newValue.toString() !== uiInput.value) {
					uiInput.value = newValue;
				}
			};

		toArray(this.container.querySelectorAll('input,select')).forEach(
			(input): void => {
				if (Dom.isTag(input, 'select')) {
					const uiInput = new UISelect(this.j, {
						options: toArray(input.options).map((opt) => ({
							text: opt.innerText,
							value: opt.value
						})),
						onChange: (value): void => {
							this.updateState(input.name, value);
						}
					});

					Dom.replace(
						input,
						uiInput.container,
						this.j.create,
						false,
						true
					);

					this.onUpdates.push(getOnUpdate(uiInput, input));

					return;
				}

				if (Dom.isTag(input, 'input')) {
					switch (input.type) {
						case 'range': {
							const uiInput = new UIRange(this.j, {
								label: input.placeholder,
								name: input.name,
								min: parseInt(input.min, 0) || 0,
								max: parseInt(input.max, 0) || 100,
								onChange: (value): void => {
									this.updateState(
										input.name,
										parseInt(value, 10)
									);
								}
							});

							Dom.replace(
								input,
								uiInput.container,
								this.j.create
							);

							this.onUpdates.push(getOnUpdate(uiInput, input));
							return;
						}

						case 'text': {
							const uiInput = new UIInput(this.j, {
								placeholder: input.placeholder,
								name: input.name,
								onChange: (value): void => {
									this.updateState(input.name, value);
								}
							});

							Dom.replace(
								input,
								uiInput.container,
								this.j.create
							);

							this.onUpdates.push(getOnUpdate(uiInput, input));
							return;
						}

						case 'checkbox':
							input.onchange = (): void =>
								this.updateState(input.name, input.checked);

							this.onUpdates.push(() => {
								input.checked = this.state[input.name];
							});
							return;
					}
				}
			}
		);

		this.update();
	}

	private onUpdates: Function[] = [];

	override update(): void {
		this.onUpdates.forEach((cb) => cb());

		const boxShadow = this.getElm('box-shadow');
		assert(boxShadow != null, 'box-shadow does not exists');
		const textShadow = this.getElm('text-shadow');
		assert(textShadow != null, 'text-shadow does not exists');

		boxShadow.style.display = this.state.boxShadow ? '' : 'none';
		textShadow.style.display = this.state.textShadow ? '' : 'none';
	}

	/** @override */
	protected override render(): string {
		return `<div>
			<div class='&__group &__text'>
				<div class='&__title'>Text</div>
				<div class='&__row'>
					<div class='&__col'>
						<input type='text' name='text'/>
						<input type='text' name='className' placeholder='~Class name~'/>
						<input type='text' name='href' placeholder='~URL~'/>
						<select name='fontFamily'>
 							<option value='Arial'>Arial</option>
 							<option value='Courier New'>Courier New</option>
 							<option value='Georgia'>Georgia</option>
 							<option value='Impact'>Impact</option>
 							<option value='Times New Roman'>Times New Roman</option>
 							<option value='Trebuchet MS'>Trebuchet MS</option>
 							<option value='Verdana'>Verdana</option>
						</select>
					</div>
					<div class='&__col'>
						<input type='range' min='8' max='28' name='fontSize' placeholder='~Font Size~'/>
						<div class='&__checkboxes'>
							<label>
								<input type='checkbox' name='fontWeight'/> bold
							</label>
							<label>
								<input type='checkbox' name='fontItalic'/> italic
							</label>
						</div>
					</div>
				</div>
			</div>
			<div class='&__group &__sizes'>
				<div class='&__title'>~Size~</div>
				<div class='&__row'>
					<div class='&__col'>
						<input type='range' name='paddingX' min='0' max='32' placeholder='~Vertical size~'/>
					</div>
					<div class='&__col'>
						<input type='range' name='paddingY' min='0' max='76' placeholder='~Horizontal size~'/>
					</div>
				</div>
			</div>
			<div class='&__group &__borders'>
				<div class='&__title'>~Border~</div>
				<div class='&__row'>
					<div class='&__col'>
						<input type='range' name='borderRadius' min='0' max='42' placeholder='~Border Radius~'/>
					</div>
					<div class='&__col'>
						<input type='range' name='borderSize' min='0' max='12' placeholder='~Border Size~'/>
					</div>
				</div>
			</div>
			<div class='&__group'>
				<div class='&__title'>~Box Shadow~ <input type='checkbox' name='boxShadow'/></div>
				<div class='&__row &__box-shadow'>
					<div class='&__col'>
						<input type='range' name='boxShadowOffsetX' min='-50' max='50' placeholder='~Vertical Position~'/>
						<input type='range' name='boxShadowBlurRadius' min='0' max='50' placeholder='~Blur Radius~'/>
					</div>
					<div class='&__col'>
						<input type='range' name='boxShadowOffsetY' min='-50' max='50' placeholder='~Horizontal Position~'/>
						<input type='range' name='boxShadowSpreadRadius' min='-50' max='50' placeholder='~Spread Radius~'/>
					</div>
				</div>
			</div>
			<div class='&__group'>
				<div class='&__title'>~Text Shadow~ <input type='checkbox' name='textShadow'/></div>
				<div class='&__row &__text-shadow'>
					<div class='&__col'>
						<input type='range' name='textShadowOffsetX' min='-50' max='50' placeholder='~Vertical Position~'/>
						<input type='range' name='textShadowBlurRadius' min='0' max='50' placeholder='~Blur Radius~'/>
					</div>
					<div class='&__col'>
						<input type='range' name='textShadowOffsetY' min='-50' max='50' placeholder='~Horizontal Position~'/>
					</div>
				</div>
			</div>
		</div>`;
	}
}
