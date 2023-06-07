import { ItemView, WorkspaceLeaf } from "obsidian";
import SvelteDemoViewComponent from "./SvelteDemoView.svelte";
import type MyPlugin from "main";

export const VIEW_TYPE_EXAMPLE = "svelte-demo-view";

export class SvelteDemoView extends ItemView {
	component: SvelteDemoViewComponent;

	constructor(leaf: WorkspaceLeaf, private plugin: MyPlugin) {
		super(leaf);
	}

	getViewType() {
		return VIEW_TYPE_EXAMPLE;
	}

	getDisplayText() {
		return "Example view";
	}

	async onOpen(): Promise<void> {
		this.renderView();
	}

	async onClose(): Promise<void> {
		this.component.$destroy();
	}

	private renderView() {
		this.component = new SvelteDemoViewComponent({
			target: this.contentEl,
			props: {
				title: "KGAR WILL WRITE PLURGINS",
			},
		});
	}
}
