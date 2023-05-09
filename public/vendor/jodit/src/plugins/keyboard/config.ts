/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */
import type { IKeys, ILayoutKeys } from './interface';
import type { IDictionary, ButtonGroup, IViewBased } from 'jodit/types';
import { Config } from 'jodit/config';

declare module 'jodit/config' {
	interface Config {
		keyboard: {
			keySize: number;
			layout: number[][];

			extraKeyButtons: Array<IKeys | string>;
			extraKeyGroup: ButtonGroup;

			layoutList: IDictionary<ILayoutKeys>;
			defaultLayoutSet: string;
			showLayoutSwitcher: boolean;
			layoutSwitchList: string[];

			delayKeyRepeat: number;
			periodKeyRepeat: number;
		};
	}
}

Config.prototype.keyboard = {
	defaultLayoutSet: 'en',
	showLayoutSwitcher: true,
	extraKeyGroup: 'other',
	extraKeyButtons: [],

	delayKeyRepeat: 350,
	periodKeyRepeat: 100,

	layoutList: {
		en: {
			title: 'English',
			// prettier-ignore
			keys: [
				['` ~ ±', '1 ! §', '2 @', '3 #', '4 $', '5 %', '6 ^', '7 &', '8 *', '9 (', '0 )', '- _', '= +', 'Backspace'],
				['Tab', 'q Q', 'w W', 'e E', 'r R', 't T', 'y Y', 'u U', 'i I', 'o O', 'p P', '[ {', '] }', '\\ |'],
				['Caps', 'a A', 's S', 'd D', 'f F', 'g G', 'h H', 'j J', 'k K', 'l L', '; :', '\' "', 'Enter'],
				['Shift', 'z Z', 'x X', 'c C', 'v V', 'b B', 'n N', 'm M', ', <', '. >', '/ ?', 'Shift'],
				['Options', 'Space', 'Options'],
			]
			// prettier-ignore-end
		},
		es: {
			title: 'Español',
			// prettier-ignore
			keys: [
				['º ` ~', '1 ! §', '2 @', '3 #', '4 $', '5 %', '6 ^', '7 &', '8 *', '9 (', '0 )', '- _ |', '¡ = +', 'Backspace'],
				['Tab', 'q Q', 'w W', 'e E', 'r R', 't T', 'y Y', 'u U', 'i I', 'o O', 'p P', '[ {', '] }', 'ç Ç \\'],
				['Caps', 'a A', 's S', 'd D', 'f F', 'g G', 'h H', 'j J', 'k K', 'l L', 'ñ Ñ ; :', '\' "', 'Enter'],
				['Shift', 'z Z', 'x X', 'c C', 'v V', 'b B', 'n N', 'm M', ', <', '. >', '/ ?', 'Shift'],
				['Options', 'Space', 'Options'],
			]
			// prettier-ignore-end
		},
		de: {
			title: 'Deutsch',
			// prettier-ignore
			keys: [
				['` ~ ±', '1 ! §', '2 @', '3 #', '4 $', '5 %', '6 ^', '7 &', '8 * :', '9 ( {', '0 ) }', '- _', '= +', 'Backspace'],
				['Tab', 'q Q', 'w W', 'e E', 'r R', 't T', 'z Z', 'u U', 'i I', 'o O', 'p P', 'ü Ü [', '] }', '\\ |'],
				['Caps', 'a A', 's S', 'd D', 'f F', 'g G', 'h H', 'j J', 'k K', 'l L', 'ö Ö ;', 'ä Ä \' "', 'Enter'],
				['Shift', 'y Y', 'x X', 'c C', 'v V', 'b B', 'n N', 'm M', ', <', '. >', '/ ?', 'Shift'],
				['Options', 'Space', 'Options'],
			]
			// prettier-ignore-end
		},
		ru: {
			title: 'Русский',
			// prettier-ignore
			keys: [
				['` ~ ±', '1 ! §', '2 @ "', '3 # :', '4 $ <', '5 % >', '6 ^', '7 &', '8 *', '9 (', '0 )', '- _', '= +', 'Backspace'],
				['Tab', 'й Й', 'ц Ц', 'у У', 'к К', 'е Е', 'н Н', 'г Г', 'ш Ш', 'щ Щ', 'з З', 'х Х [', 'ъ ] {', '\\ | }'],
				['Caps', 'ф Ф', 'ы Ы', 'в В', 'а А', 'п П', 'р Р', 'о О', 'л Л', 'д Д', 'ж Ж ;', 'э Э \'', 'Enter'],
				['Shift', 'я Я', 'ч Ч', 'с С', 'м М', 'и И', 'т Т', 'ь Ь', 'б Б ,', 'ю Ю .', '/ ?', 'Shift'],
				['Options', 'Space', 'Options'],
			]
			// prettier-ignore-end
		},
		tr: {
			title: 'Türkçe',
			// prettier-ignore
			keys: [
				['" é` ~', '1 ! §', '2 @ "', '3 # :', '4 $ <', '5 % >', '6 ^ ±', '7 &', '8 *', '9 ( {', '0 ) }', '- _ [', '= + ]', 'Backspace'],
				['Tab', 'q Q', 'w W', 'e E', 'r R', 't T', 'y Y', 'u U', 'ı I', 'o O', 'p P', 'ğ Ğ', 'ü Ü', ', \\ |'],
				['Caps', 'a A', 's S', 'd D', 'f F', 'g G', 'h H', 'j J', 'k K', 'l L', 'ş Ş', 'i̇ İ', 'Enter'],
				['Shift', 'z Z', 'x X', 'c C', 'v V', 'b B', 'n N', 'm M', 'ö Ö <', 'ç Ç >', '. / ?', 'Shift'],
				['Options', 'Space', 'Options'],
			]
			// prettier-ignore-end
		},
		iw: {
			title: 'Hebrew',
			// prettier-ignore
			keys: [
				['` ~ ±', '1 ! §', '2 @', '3 #', '4 $', '5 %', '6 ^', '7 &', '8 *', '9 (', '0 )', '- _', '= +', 'Backspace'],
				['Tab', '/ q Q', '\' w W', 'ק e E', 'ר r R', 'א t T', 'ט y Y', 'ו u U', 'ן i I', 'ם o O', 'פ p P', '[ {', '] }', '\\ |'],
				['Caps', 'ש a A', 'ד s S', 'ג d D', 'כ f F', 'ע g G', 'י h H', 'ח j J', 'ל k K', 'ך l L', 'ף ; :', '\' "', 'Enter'],
				['Shift', 'ז z Z', 'ס x X', 'ב c C', 'ה v V', 'נ b B', 'מ n N', 'צ m M', ', <', '. >', '/ ?', 'Shift'],
				['Options', 'Space', 'Options'],
			]
			// prettier-ignore-end
		},
		tata: {
			title: 'Tata',
			// prettier-ignore
			keys: [
				['һ Һ` ~', '1 ! §', '2 @ "', '3 # :', '4 $ <', '5 % >', '6 ^ ±', '7 &', '8 *', '9 ( {', '0 )', '- _', '= +', 'Backspace'],
				['Tab', 'й Й', 'ө Ө', 'у У', 'к К', 'е Е', 'н Н', 'г Г', 'ш Ш', 'ә Ә', 'з З', 'х Х [', 'ү Ү ]', '\\ | }'],
				['Caps', 'ф Ф', 'ы Ы', 'в В', 'а А', 'п П', 'р Р', 'о О', 'л Л', 'д Д', 'ң Ң ;', 'э Э \'', 'Enter'],
				['Shift', 'я Я', 'ч Ч', 'с С', 'м М', 'и И', 'т Т', 'җ Җ', 'б Б ,', 'ю Ю .', 'ґ Ґ /', 'Shift'],
				['Options', 'Space', 'Options'],
			]
			// prettier-ignore-end
		}
	},
	layoutSwitchList: ['en', 'es', 'de', 'ru', 'tr', 'iw', 'tata'],
	keySize: 32,
	// prettier-ignore
	layout: [
		[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2],
		[1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5],
		[1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.2],
		[2.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.5],
		[3.5, 9, 3.5]
	]
	// prettier-ignore-end
};

Config.prototype.controls.keyboard = {
	tooltip: 'Keyboard',
	icon: require('./icon.svg'),
	isActive(editor: IViewBased): boolean {
		return Boolean(editor.e.fire('isKeyboardOpened'));
	},
	command: 'toggleKeyboard'
};

Config.prototype.controls.extraKeyboardButtons = {};
