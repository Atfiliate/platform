/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './combo-box.less';

import { UIInput } from 'jodit/core/ui';
import { watch, debounce, hook } from 'jodit/core/decorators';

export class UIComboBox extends UIInput {
	override className(): string {
		return 'UIComboBox';
	}

	@hook('ready')
	protected onReady(): void {
		const autocomplete = new google.maps.places.Autocomplete(
			this.nativeInput as HTMLInputElement,
			{
				fields: ['address_components', 'geometry', 'name'],
				types: ['geocode']
			}
		);

		autocomplete.addListener('place_changed', () => {
			const place = autocomplete.getPlace();
			this.j.e.fire(
				this,
				'select',
				place.geometry?.location,
				place.geometry?.viewport
			);
		});
	}

	@watch('nativeInput:input')
	@debounce()
	protected async onInput(): Promise<void> {
		// try {
		// 	const results: google.maps.GeocoderResult[] = await this.search(
		// 		this.value
		// 	);
		//
		// 	this.suggestions.clear();
		//
		// 	results.forEach((result) => {
		// 		const item = new UISuggestionItem(this.j, result);
		// 		item.container.classList.add(
		// 			this.getFullElName('suggestion-item')
		// 		);
		// 		this.suggestions.append(item);
		// 	});
		// } catch (e) {}
	}
}
