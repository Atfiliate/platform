/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type { IJodit } from 'jodit/types';
import { Plugin } from 'jodit/core/plugin';
import { Ajax } from 'jodit/core/request/ajax';
import { Jodit } from '../../index';

import './config';
import { generateCriticalCSS } from 'jodit/plugins/print/lib/generate-critical-css';
import { Dom } from 'jodit/core/dom';
import { previewBox } from 'jodit/src/core/helpers/utils/print';

export class ExportDocs extends Plugin {
	override requires = ['license'];

	override buttons = [
		{
			name: 'exportDocs',
			group: 'media'
		}
	];

	protected afterInit(jodit: IJodit): void {
		jodit.registerCommand('exportToPDF', async () => {
			const css = generateCriticalCSS(jodit);

			const ajax = new Ajax({
				...(jodit.o.exportDocs.ajax ?? jodit.o.filebrowser.ajax),
				method: 'POST',
				responseType: 'blob',
				onProgress(percent): void {
					jodit.progressbar.show().progress(percent);
				},
				data: {
					action: 'generatePdf',
					html: `<style>${
						css + jodit.o.exportDocs.css
					}</style>${ExportDocs.getValue(jodit)}`
				}
			});

			jodit.e.on('beforeDestruct', ajax.destruct);

			try {
				const resp = await ajax.send();
				const buffer = await resp.blob();

				const link = this.j.create.a(),
					filename = 'document.pdf';

				link.href = URL.createObjectURL(buffer);
				link.download = filename;
				link.click();
				Dom.safeRemove(link);
				URL.revokeObjectURL(link.href);
			} catch (e: any) {
				e.message && jodit.alert(e.message);
			} finally {
				jodit.progressbar.progress(100);
				await jodit.async.delay(200);
				jodit.progressbar.hide();
			}
		});
	}

	private static getValue(jodit: IJodit): string {
		const div = previewBox(jodit);
		return div.innerHTML;
	}

	protected beforeDestruct(): void {}
}

Jodit.plugins.add('exportDocs', ExportDocs);
