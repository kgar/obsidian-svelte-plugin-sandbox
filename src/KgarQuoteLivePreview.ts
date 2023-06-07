/*
 * inspired and adapted from https://github.com/javalent/dice-roller/blob/main/src/live-preview.ts
 *
 * The original work is MIT-licensed.
 *
 * MIT License
 *
 * Copyright (c) 2022 artisticat1
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * */

import {
	Decoration,
	EditorView,
	ViewPlugin,
	ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import type CodeMirrorView from "@codemirror/view";
import { EditorSelection, Range } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import {
	editorEditorField,
	editorInfoField,
	editorLivePreviewField,
} from "obsidian";
import type MyPlugin from "main";
import type { NodeType } from "@lezer/common";

function selectionAndRangeOverlap(
	selection: EditorSelection,
	rangeFrom: number,
	rangeTo: number
) {
	for (const range of selection.ranges) {
		if (range.from <= rangeTo && range.to >= rangeFrom) {
			return true;
		}
	}

	return false;
}

function renderKgarQuoteEnhancer(view: EditorView) {
	const currentFile = app.workspace.getActiveFile();
	if (!currentFile) return;

	const widgets: Range<Decoration>[] = [];
	const selection = view.state.selection;

	let state: "not-quote" | "beginning-of-quote" | "within-quote" =
		"not-quote";
	let quoteDepth = 0;

	for (const { from, to } of view.visibleRanges) {
		syntaxTree(view.state).iterate({
			from,
			to,
			enter: ({ node }) => {
				const type = node.type;

				if (type.name.includes("formatting")) return;

				const nodeStart = node.from;
				const nodeEnd = node.to;

				// don't continue if current cursor position and inline code node (including formatting
				// symbols) overlap
				if (selectionAndRangeOverlap(selection, nodeStart, nodeEnd + 1))
					return;

				if (!isBlockQuote(type)) {
					return;
				}

				const childNode = node.lastChild;

				if (!childNode) {
					return;
				}

				const childStart = childNode.from;
				const childEnd = childNode.to;
				const original = view.state.doc
					.sliceString(childStart, childEnd)
					.trim();

				const previousState = state;
				const previousQuoteDepth = quoteDepth;

				quoteDepth = getQuoteDepth(type.name);

				state = !isBlockQuote(type)
					? "not-quote"
					: previousState === "not-quote"
					? "beginning-of-quote"
					: quoteDepth > previousQuoteDepth
					? "beginning-of-quote"
					: "within-quote";

				if (
					state !== "beginning-of-quote" ||
					original
						.replace(/\>\s/gi, "")
						?.toLocaleLowerCase()
						.trim() !== "$kgar"
				) {
					return;
				}

				const widget = new KgarQuoteEnhancerInlineWidget(
					original,
					view
				);

				widgets.push(
					Decoration.replace({
						widget,
						inclusive: false,
						block: false,
					}).range(childStart, childEnd)
				);
			},
		});
	}
	return Decoration.set(widgets, true);
}
export class KgarQuoteEnhancerInlineWidget extends WidgetType {
	constructor(readonly rawQuery: string, private view: EditorView) {
		super();
	}

	// Widgets only get updated when the raw query changes/the element gets focus and loses it
	// to prevent redraws when the editor updates.
	eq(other: KgarQuoteEnhancerInlineWidget): boolean {
		if (other.rawQuery === this.rawQuery) {
			return true;
		}

		return false;
	}

	// Add CSS classes and return HTML element.
	// In "complex" cases it will get filled with the correct text/child elements later.
	toDOM(view: EditorView): HTMLElement {
		const span = document.createElement("span");
		span.createEl("strong", { text: "kgar 🌟" });
		return span;
	}

	/* Make queries only editable when shift is pressed (or navigated inside with the keyboard
	 * or the mouse is placed at the end, but that is always possible regardless of this method).
	 * Mostly useful for links, and makes results selectable.
	 * If the widgets should always be expandable, make this always return false.
	 */
	ignoreEvent(event: MouseEvent | Event): boolean {
		// instanceof check does not work in pop-out windows, so check it like this
		if (event.type === "mousedown") {
			const currentPos = this.view.posAtCoords({
				x: (event as MouseEvent).x,
				y: (event as MouseEvent).y,
			});
			if ((event as MouseEvent).shiftKey) {
				// Set the cursor after the element so that it doesn't select starting from the last cursor position.
				if (currentPos) {
					//@ts-ignore
					const { editor } = this.view.state
						.field(editorEditorField)
						.state.field(editorInfoField);
					editor?.setCursor(editor.offsetToPos(currentPos));
				}
				return false;
			}
		}
		return true;
	}
}
function isBlockQuote(type: NodeType) {
	return type.name.includes("quote_");
}

function getQuoteDepth(typeName: string): number {
	const number = +typeName.substring(typeName.lastIndexOf("-") + 1);

	return !isNaN(number) ? number : 0;
}

export function kgarQuoteInlineEnhancerPlugin(plugin: MyPlugin) {
	return ViewPlugin.fromClass(
		class {
			decorations: CodeMirrorView.DecorationSet;
			constructor(view: EditorView) {
				this.decorations =
					renderKgarQuoteEnhancer(view) ?? Decoration.none;
			}

			update(update: ViewUpdate) {
				// only activate in LP and not source mode
				//@ts-ignore
				if (!update.state.field(editorLivePreviewField)) {
					this.decorations = Decoration.none;
					return;
				}
				if (
					update.docChanged ||
					update.viewportChanged ||
					update.selectionSet
				) {
					this.decorations =
						renderKgarQuoteEnhancer(update.view) ?? Decoration.none;
				}
			}
		},
		{ decorations: (v) => v.decorations }
	);
}
