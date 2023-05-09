/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import type {
	IControlType,
	IDictionary,
	IJodit,
	HTMLTagNames,
	IViewBased,
	Nullable
} from 'jodit/types';
import { Config } from 'jodit/config';
import { Dom } from 'jodit/core/dom';
import { call } from 'jodit/core/helpers';

declare module 'jodit/config' {
	interface Config {
		tuneBlock: {
			popup: IDictionary<Array<IControlType | string>>;
		};
	}
}

const common = ['tune.up', 'tune.remove', 'tune.down'],
	header = [
		'tune.h1',
		'tune.h2',
		'tune.h3',
		'\n',
		'tune.h4',
		'tune.h5',
		'tune.h6',
		'\n',
		...common
	];

Config.prototype.tuneBlock = {
	popup: {
		p: common,
		table: common,
		img: common,
		blockquote: common,
		div: common,
		pre: ['tune.editPre', ...common],
		h1: header,
		h2: header,
		h3: header,
		h4: header,
		h5: header,
		h6: header
	}
};

function headerControl(h: HTMLTagNames): IControlType {
	return <IControlType>{
		icon:
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50">' +
			'<text dominant-baseline="text-before-edge" style="font: 45px sans-serif" x="0" y="0">' +
			h.toUpperCase() +
			'</text>' +
			'</svg>',

		isActive(editor, control, button): boolean {
			return button?.target?.tagName.toLowerCase() === h;
		},

		exec(editor: IJodit, target): true {
			if (target) {
				editor.selection.save();
				const header = Dom.replace(
					<HTMLElement>target,
					h,
					editor.createInside
				);

				editor.selection.restore();

				editor.e.fire('synchro');
				editor.e.fire('afterExecTune.tune', header);
			}

			return true;
		}
	};
}

function moveTo(up: boolean): IControlType {
	const sibling = up ? 'previousSibling' : 'nextSibling';

	return <IControlType>{
		icon: up ? 'angle-up' : 'angle-down',
		isDisabled(editor, control, button): boolean {
			return !button?.target?.[sibling];
		},
		exec(editor: IJodit, target): true {
			const siblingNode = target?.[sibling];

			if (target && siblingNode) {
				editor.selection.save();
				call(up ? Dom.before : Dom.after, siblingNode, target);
				editor.selection.restore();
			}

			editor.e.fire('synchro');
			editor.e.fire('afterExecTune.tune');

			return true;
		}
	};
}

Config.prototype.controls.tune = {
	h1: headerControl('h1'),
	h2: headerControl('h2'),
	h3: headerControl('h3'),
	h4: headerControl('h4'),
	h5: headerControl('h5'),
	h6: headerControl('h6'),
	up: moveTo(true),
	down: moveTo(false),
	editPre: {
		icon: 'pencil',
		exec(editor: IViewBased, target: Nullable<Node>): void {
			editor.e.fire('editPreInPasteCode', target);
		}
	},
	remove: {
		icon: 'bin',
		exec(editor: IViewBased, target: Nullable<Node>): void {
			Dom.safeRemove(target);
			editor.e.fire('synchro');
			editor.e.fire('closeTuner.tune');
			editor.e.fire('hideTuner.tune');
		}
	}
};
