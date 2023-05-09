/*!
 * Jodit Editor PRO (https://xdsoft.net/jodit/)
 * See LICENSE.md in the project root for license information.
 * Copyright (c) 2013-2023 Valeriy Chupurnov. All rights reserved. https://xdsoft.net/jodit/pro/
 */

import './tuner.less';

import type { CanUndef, IJodit, IPopup, IToolbarCollection } from 'jodit/types';
import { Popup, UIElement } from 'jodit/core/ui';
import { Dom } from 'jodit/core/dom';
import { assert, css, position } from 'jodit/core/helpers';
import { component, idle, throttle, watch } from 'jodit/core/decorators';
import { makeCollection } from 'jodit/modules/toolbar/factory';

@component
export class UITuner extends UIElement<IJodit> {
	private isShown: Boolean = false;
	private toolbar: IToolbarCollection = makeCollection(this.j, this);
	private popup: IPopup = new Popup(this.j, false);

	override className(): string {
		return 'UITuner';
	}

	protected currentBlock!: HTMLElement;

	protected override render(): string {
		return `<div>
			<div class='&__handle' title='~Click to tune~'/>
		</div>`;
	}

	/**
	 * Shows the tuner, even if it is already shown - recalculates its position
	 */
	show(): void {
		const target = this.j.s.current();

		if (!target) {
			return this.hide();
		}

		const block = Dom.isBlock(target)
			? target
			: Dom.closest(
					<Node>target,
					(node) =>
						Boolean(
							node &&
								this.j.o.tuneBlock.popup[
									node.nodeName.toLowerCase()
								]
						),
					this.j.editor
			  );

		if (
			!block ||
			block === this.j.editor ||
			!this.j.o.tuneBlock.popup[block.tagName.toLowerCase()]
		) {
			return this.hide();
		}

		this.currentBlock = block;

		this.isShown = true;

		this.closeToolbar();
		this.calcPosition();

		if (!this.container.parentNode) {
			this.j.workplace.append(this.container);
		}
	}

	/**
	 * Hides the tuner button
	 */
	@watch(':hideTuner.tune')
	hide(): void {
		if (this.isShown) {
			this.isShown = false;
			Dom.safeRemove(this.container);
			this.closeToolbar();
		}
	}

	/**
	 * Recalculates the position of the tuner button when scrolling the editor itself
	 */
	@watch('j.editor:scroll')
	@throttle(10)
	protected onEditorScroll(): void {
		if (this.isShown) {
			this.calcPosition();
		}
	}

	/**
	 * Calculates the position of the tuner in the editor so that it is always to the right of the block
	 */
	private calcPosition(): void {
		const offset = 15;
		const marginLeft = css(this.j.editor, 'marginLeft') as number;
		const paddingLeft = css(this.j.editor, 'paddingLeft') as number;
		const marginTop = css(this.j.editor, 'marginTop') as number;

		const left =
			this.currentBlock.offsetWidth - offset + marginLeft + paddingLeft;
		const top =
			this.currentBlock.offsetTop - this.j.editor.scrollTop + marginTop;

		css(this.container, {
			transform: `translate3d(${left}px, ${top}px, 0)`
		});

		if (this.popup.isOpened) {
			this.popup.updatePosition();
		}
	}

	/**
	 * Handler: `afterExecTune.tune`
	 */
	@watch(':afterExecTune.tune')
	@idle()
	protected onAfterExecTune(newBlock: CanUndef<HTMLElement>): void {
		if (newBlock) {
			this.currentBlock = newBlock;
		}

		this.calcPosition();
		this.openToolbar();
	}

	/**
	 * To prevent the editor from losing focus when clicking on the handler - we will prevent the click
	 */
	@watch('container:click container:mousedown')
	protected onClickPrevent(e: MouseEvent): void {
		e.preventDefault();
		e.stopPropagation();
	}

	/**
	 * Handler: click on the tuner button
	 */
	@watch('handle:click')
	protected onTargetClick(): void {
		this.toggleToolbar();
	}

	/**
	 * Opens the tuner toolbar
	 */
	private openToolbar(): void {
		this.setMod('opened', true);

		this.toolbar.build(
			this.j.o.tuneBlock.popup[this.currentBlock.tagName.toLowerCase()],
			this.currentBlock
		);

		this.popup.setContent(this.toolbar.container);

		if (!this.popup.isOpened) {
			const handle = this.getElm('handle');
			assert(handle != null, 'Handle element does not exist');
			this.popup.open(() => position(handle));
		}
	}

	/**
	 * Closes the tuner toolbar
	 */
	@watch(':closeTuner.tune')
	private closeToolbar(): void {
		this.setMod('opened', false);
		this.popup.close();
	}

	private toggleToolbar(): void {
		this.getMod('opened') ? this.closeToolbar() : this.openToolbar();
	}
}
