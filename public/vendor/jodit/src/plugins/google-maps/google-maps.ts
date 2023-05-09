/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './google-maps.less';

import type { IUIMapBaseState, IUIMapState } from './interface';
import type { CanUndef, IDialog, IJodit, Nullable } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Jodit } from '../../index';

import './config';
import './assets';

import { TabsWidget } from 'jodit/modules/widget';
import { Button } from 'jodit/core/ui/button';
import { appendScriptAsync } from 'jodit/core/helpers';
import { SOURCE_CONSUMER } from 'jodit/core/constants';
import { watch } from 'jodit/core/decorators';
import { Dialog } from 'jodit/modules/dialog/dialog';

import { UIMap, UIMapsControlsForm, UIMapsPropsForm } from './ui';
import {
	googleReady,
	GoogleReadyHandler,
	isApiAvailable
} from './helpers/helpers';
import { staticUrl } from './helpers/static-url';
import { UIComboBox } from './ui/combo-box/combo-box';
import { generateJSScript } from './helpers/generate-js-script';
import { COMMAND_OPEN_DIALOG, STORAGE_KEY } from './helpers/const';

// @ts-ignore
window['JoditGoogleReadyHandler'] = GoogleReadyHandler;

export class googleMaps extends Plugin {
	override requires = ['license', 'color-picker'];

	override className(): string {
		return 'google-maps';
	}

	override buttons: Plugin['buttons'] = [
		{ group: 'media', name: 'googleMaps' }
	];

	protected afterInit(jodit: IJodit): void {
		jodit.registerCommand(COMMAND_OPEN_DIALOG, () => {
			void this.openMapEditor(null, {});
		});
	}

	protected beforeDestruct(jodit: IJodit): void {}

	@watch('?:openOnDblClick')
	protected onOpenOnDblClick(image: HTMLImageElement): void | false {
		if (image.dataset.googleMaps) {
			let json: CanUndef<Partial<IUIMapState>>;

			try {
				json = JSON.parse(this.j.ow.atob(image.dataset.googleMaps));
			} catch {}

			void this.openMapEditor(image, json);

			return false;
		}
	}

	protected async openMapEditor(
		target: Nullable<HTMLImageElement>,
		initialState?: Partial<IUIMapState>
	): Promise<void> {
		const jodit = this.j;

		const dialog = this.getDialog();

		const state = this.j.o.googleMaps.saveStateInStorage
			? dialog.storage.get<IUIMapBaseState>(STORAGE_KEY)
			: undefined;

		const { apiUrl } = this.jodit.o.googleMaps;

		if (!isApiAvailable()) {
			void appendScriptAsync(
				this.jodit,
				apiUrl.replace(
					/\${([^}]+)}/g,
					(_, key) => this.get<string>(key) ?? ''
				)
			);
		}

		const openState = {
			type: this.j.o.googleMaps.map.type,
			layer: this.j.o.googleMaps.map.layer,
			size: this.j.o.googleMaps.map.size,
			...state,
			...initialState
		};

		const uiMap = new UIMap(dialog, openState, this.j.options);
		uiMap.container.classList.add(dialog.getFullElName('map'));

		const search = new UIComboBox(jodit, {
			icon: 'search',
			placeholder: 'Search',
			clearButton: true
		}).setMod('in-header', true);

		search.container.classList.add(dialog.getFullElName('search'));

		this.j.async
			.promise((resolve) => {
				if (isApiAvailable()) {
					resolve(0);
					return;
				}

				// TODO - Need check googleReady
				const intervalChecker = (): void => {
					if (isApiAvailable()) {
						resolve(0);
					} else {
						this.j.async.setTimeout(intervalChecker, 100);
					}
				};

				intervalChecker();
				googleReady(resolve);
			})
			.then(() => {
				uiMap.setStatus('ready');
				search.setStatus('ready');
			});

		this.j.e.on(
			search,
			'select',
			(
				marker: Nullable<google.maps.LatLng>,
				bound: Nullable<google.maps.LatLngBounds>
			) => {
				if (bound) {
					uiMap.map.fitBounds(bound);
					return;
				}

				if (marker) {
					uiMap.state.center = [marker.lat(), marker.lng()];
				}
			}
		);

		if (!state) {
			if (this.j.o.googleMaps.map.center === 'auto') {
				navigator.geolocation.getCurrentPosition(
					(position) => {
						uiMap.state.center = [
							position.coords.latitude,
							position.coords.longitude
						];
					},
					() => {
						uiMap.state.center =
							this.j.o.googleMaps.map.defaultCenter;
					}
				);
			} else {
				uiMap.state.center = this.j.o.googleMaps.map.center;
			}
		}

		dialog
			.setSize(...jodit.o.googleMaps.dialog.size)
			.setHeader([
				search,
				'&nbsp;',
				Button(jodit, 'eye').onAction(() => {
					const image = this.jodit.createInside.element('img');
					image.src = staticUrl(uiMap);
					image.dataset.googleMaps = btoa(uiMap.json());
					const data = { value: image.outerHTML };
					this.onAfterGetValueFromEditor(data);
					jodit.execCommand('preview', null, data.value);
				})
			])
			.setContent(
				TabsWidget(jodit, [
					{
						name: 'Map',
						icon: 'map',
						content: uiMap
					},
					{
						name: 'Settings',
						content: new UIMapsPropsForm(jodit, uiMap.state)
					},
					{
						name: 'Controls',
						icon: 'menu',
						content: new UIMapsControlsForm(jodit, uiMap.state)
					}
				])
			)
			.setFooter([
				Button(jodit, 'cancel', 'Cancel', 'default').onAction(() =>
					dialog.close()
				),
				Button(
					jodit,
					'ok',
					target ? 'Save' : 'Insert',
					'primary'
				).onAction(() => {
					uiMap.destruct();
					search.destruct();
					dialog.e.off('beforeClose', onCLose);
					dialog.close();

					this.insertMap(target, uiMap);
				})
			])
			.open();

		const onCLose = (): false | void => {
			if (
				uiMap.state.elements.length &&
				JSON.stringify(uiMap.state.elements) !==
					JSON.stringify(openState.elements)
			) {
				// @ts-ignore
				if (!isTest && !confirm(this.i18n('Are you sure?'))) {
					return false;
				}
			}

			uiMap.destruct();
			search.destruct();

			dialog.e.off('beforeClose', onCLose);
		};

		dialog.e.on('beforeClose', onCLose);
	}

	private dialog: Nullable<IDialog> = null;

	private getDialog(): IDialog {
		if (!this.dialog) {
			const dialog = new Dialog({
				language: this.j.o.language
			});

			dialog.container.classList.add(this.getFullElName(''));

			this.dialog = dialog;
		}

		return this.dialog;
	}

	private insertMap(target: HTMLImageElement | null, uiMap: UIMap): void {
		const image = target ?? this.jodit.createInside.element('img');
		image.src = staticUrl(uiMap);
		image.dataset.googleMaps = btoa(uiMap.json());

		target || this.jodit.s.insertImage(image);
	}

	@watch(':beforeSetNativeEditorValue')
	protected onBeforeSetNativeEditorValue(data: { value: string }): void {
		data.value = data.value.replace(
			/<script[^>]+jodit-google-maps-init[^>]+>.*?<\/script>/gs,
			''
		);
	}

	@watch(':afterGetValueFromEditor')
	protected onAfterGetValueFromEditor(
		data: { value: string },
		consumer?: string
	): void {
		if (
			this.j.o.googleMaps.useStaticImage ||
			consumer === SOURCE_CONSUMER
		) {
			return;
		}

		data.value = data.value.replace(
			/(<img[^>]+)(["']?)data-google-maps\2\s*=(["'])([^"']+)\3([^>]*>)/gs,
			(_, _1, q, q2, jsonB64, rest) => {
				let json = {} as IUIMapState;

				try {
					json = JSON.parse(this.j.ow.atob(jsonB64)) as IUIMapState;
				} catch {}

				return `${_1} id="${
					json.uid
				}" ${q}data-google-maps${q}=${q2}${jsonB64}${q2}${rest}${generateJSScript(
					this.j,
					json as IUIMapState
				)}`;
			}
		);
	}
}

Jodit.plugins.add('google-maps', googleMaps);
