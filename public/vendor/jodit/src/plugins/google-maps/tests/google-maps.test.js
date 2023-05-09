/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

describe('Google maps test', () => {
	describe('Smoke test', () => {
		it('Should have google-maps plugin in PluginSystem', () => {
			expect(typeof Jodit.plugins.get('googleMaps')).equals('function');
		});

		it('Should have googleMaps section in controls', () => {
			expect(typeof Jodit.defaultOptions.controls.googleMaps).equals(
				'object'
			);
		});

		it('Should have googleMaps button in buttons list', () => {
			expect(getButton('googleMaps', getJodit())).is.not.null;
		});
	});

	describe('Click googleMaps button in toolbar', () => {
		it('Should open dialog', () => {
			const editor = getJodit();
			clickButton('googleMaps', editor);
			const dialog = getOpenedDialog(editor);
			expect(dialog).is.not.null;
		});

		describe('Inside dialog', () => {
			it('Should be initialized Google map', (done) => {
				const editor = getJodit();
				clickButton('googleMaps', editor);
				const dialog = getOpenedDialog(editor);
				const map = dialog.component.getElm('map');
				expect(map).is.not.null;

				dialog.component.e.on(
					map.component,
					'GoogleMapsIsReady',
					() => {
						expect(map.component.map instanceof google.maps.Map).is
							.true;
						done();
					}
				);
			});
		});
	});

	describe('Work with map', () => {
		let promise;

		beforeEach(() => {
			unmockPromise();
			promise = new Promise((resolve) => {
				const editor = getJodit({
					saveStateInStorage: false
				});

				clickButton('googleMaps', editor);
				const dialog = getOpenedDialog(editor);
				const map = dialog.component.getElm('map');
				expect(map).is.not.null;

				dialog.component.e.on(
					map.component,
					'GoogleMapsIsReady',
					() => {
						editor.async.requestIdleCallback(() => {
							resolve({
								editor,
								map: map.component,
								dialog: dialog.component,
								idle: () =>
									new Promise((resolve) => {
										google.maps.event.addListenerOnce(
											map.component.map,
											'idle',
											resolve
										);
										editor.async.setTimeout(resolve, 300);
									})
							});
						});
					}
				);
			});
		});

		describe('State', () => {
			describe('Change uiMap state center', () => {
				it('Should change gmap center', async () => {
					const { map } = await promise;
					map.state.center = [55, 34];
					expect(map.map.getCenter().toJSON()).deep.eq({
						lat: 55,
						lng: 34
					});
				});

				describe('Vice versa', () => {
					it('Should change map state center', async () => {
						const { map, idle } = await promise;
						map.map.setCenter({ lat: 23, lng: 45 });
						await idle();
						expect(map.state.center).deep.eq([23, 45]);
					});
				});
			});

			describe('Change uiMap state map type', () => {
				it('Should change gmap map type', async () => {
					const { map } = await promise;
					map.state.type = 'hybrid';
					expect(map.map.getMapTypeId()).eq('hybrid');
				});

				describe('Vice versa', () => {
					it('Should change map state map type', async () => {
						const { map } = await promise;
						map.map.setMapTypeId('satellite');
						expect(map.state.type).eq('satellite');
					});
				});
			});

			describe('Change uiMap state zoom', () => {
				it('Should change gmap zoom', async () => {
					const { map } = await promise;
					map.state.zoom = 5;
					expect(map.map.getZoom()).deep.eq(5);
				});

				describe('Vice versa', () => {
					it('Should change map state zoom', async () => {
						const { map, idle } = await promise;
						map.map.setZoom(8);
						await idle();
						expect(map.state.zoom).eq(8);
					});
				});
			});

			describe('Create element', () => {
				describe('Marker', () => {
					it('Should add it in state.elements', async () => {
						const { dialog, map, idle } = await promise;
						expect(map.state.mode).eq('hand');
						clickButton('marker', dialog);
						expect(map.state.mode).eq('marker');
						await idle();
						expect(map.drawingManager.getDrawingMode()).eq(
							'marker'
						);

						const { center } = map.state;

						google.maps.event.trigger(
							map.drawingManager,
							'overlaycomplete',
							{
								overlay: {
									setMap() {},
									getPosition() {
										return {
											lat() {
												return center[0];
											},
											lng() {
												return center[1];
											}
										};
									}
								}
							}
						);

						expect(map.state.elements).deep.eq([
							{ type: 'marker', coordinates: center }
						]);
					});
				});
			});

			describe('Search', () => {
				describe('Enter LA in search input and press enter', () => {
					it.skip('Should move map to LA', async () => {
						const { idle, dialog } = await promise;
						await idle();
						const search = dialog.getElm('search');
						search.component.nativeInput.value = 'LA';
						search.component.nativeInput.focus();
						dialog.e.fire(search.component.nativeInput, 'focus');
						dialog.e.fire(search.component.nativeInput, 'input');
						await idle();
						expect(
							dialog.od.querySelectorAll('.pac-item').length
						).eq(5);
					});
				});
			});
		});

		describe('Create map', () => {
			describe('Press insert button', async () => {
				it('Should create static image inside the editor', async () => {
					const { editor, dialog, map, idle } = await promise;

					map.state.center = [55, 34];
					map.state.zoom = 5;
					map.state.size = [120, 120];

					await idle();

					clickButton('ok', dialog);
					expect(editor.value).contain(
						'<img src="https://maps.googleapis.com/maps/api/staticmap?center=55,34&amp;zoom=5&amp;size=120x120'
					);

					expect(editor.value).contains('<script');
					expect(
						editor.getEditorValue(true, 'source-consumer')
					).does.not.contain('<script');
					await idle();
					expect(editor.value).eq(editor.element.value);
				});
			});

			describe('Edit existing image map', () => {
				describe('dblclick on image', () => {
					it('Should open edit dialog', async () => {
						const { editor, dialog, map, idle } = await promise;

						map.state.center = [51, 32];
						map.state.zoom = 6;
						map.state.size = [220, 220];

						await idle();
						clickButton('ok', dialog);

						expect(
							editor.editor.querySelectorAll(
								'img[data-google-maps]'
							).length
						).eq(1);

						simulateEvent(
							'dblclick',
							editor.editor.querySelector('img[data-google-maps]')
						);

						expect(getOpenedDialog(editor)).is.not.null;
						expect(getOpenedDialog(editor)).eq(dialog.container);
					});
				});
			});
		});
	});
});
