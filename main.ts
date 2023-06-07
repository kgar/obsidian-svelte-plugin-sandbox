import {
	App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
	TFile,
	WorkspaceLeaf,
	type MarkdownPostProcessorContext,
} from "obsidian";
import { SvelteDemoView, VIEW_TYPE_EXAMPLE } from "src/SvelteDemoView";
import { fileStore, type HelloWorldFileInfo } from "src/stores";

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		console.log("Loading Hello World plugin!");

		this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"dice",
			"Sample Plugin",
			(evt: MouseEvent) => {
				// Called when the user clicks the icon.
				new Notice("This is a notice!");
			}
		);

		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");

		this.addRibbonIcon("dice", "Greet", () => {
			new Notice("Hello, world 🙋‍♂️!");
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Status Bar Text");

		this.registerView(
			VIEW_TYPE_EXAMPLE,
			(leaf: WorkspaceLeaf) => new SvelteDemoView(leaf, this)
		);

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-svelte-demo-view",
			name: "Open svelte demo view",
			callback: async () => {
				const leaf = this.app.workspace.getRightLeaf(false);
				await leaf.setViewState({
					type: VIEW_TYPE_EXAMPLE,
				});
				if (leaf) this.app.workspace.revealLeaf(leaf);
			},
		});

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: "open-sample-modal-simple",
			name: "Open sample modal (simple)",
			callback: () => {
				new SampleModal(this.app).open();
			},
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: "sample-editor-command",
			name: "Sample editor command",
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection("Sample Editor Command");
			},
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: "open-sample-modal-complex",
			name: "Open sample modal (complex)",
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			},
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "click", (evt: MouseEvent) => {
			console.log("click", evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(
			window.setInterval(() => console.log("setInterval"), 5 * 60 * 1000)
		);

		this.writeVaultFilesToStore();

		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (file instanceof TFile) {
					fileStore.update((map) =>
						map.set(file.path, {
							file,
							isKgar: determineIfKgarAsync(file),
						})
					);
				}
			})
		);
		this.registerEvent(
			this.app.vault.on("rename", async (file, oldPath) => {
				if (file instanceof TFile) {
					const isKgar = determineIfKgarAsync(file);
					fileStore.update((map) => {
						map.delete(oldPath);
						map.set(file.path, { file, isKgar });
						return map;
					});
				}
			})
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile) {
					fileStore.update((map) => {
						map.delete(file.path);
						return map;
					});
				}
			})
		);
		this.registerEvent(
			this.app.vault.on("modify", async (file) => {
				if (file instanceof TFile) {
					fileStore.update((map) => {
						const fileInfo = map.get(file.path);
						if (fileInfo) {
							fileInfo.needsUpdate = true;
						}
						return map;
					});
				}
			})
		);

		this.registerEvent(
			app.metadataCache.on("resolved", () => {
				fileStore.update((map) => {
					for (const [key, value] of map.entries()) {
						if (!value.needsUpdate) {
							continue;
						}

						value.needsUpdate = false;
						map.set(key, {
							...value,
							isKgar: determineIfKgarAsync(value.file),
						});
					}
					return map;
				});
			})
		);

		this.addRibbonIcon("dice", "Print leaf types", () => {
			this.app.workspace.iterateAllLeaves((leaf) => {
				console.log(leaf.getViewState().type);
			});
		});

		this.registerMarkdownPostProcessor(processKgarBlockquotes);
	}

	async onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);
		await this.saveData({
			lastClosed: new Date(),
		});
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async writeVaultFilesToStore() {
		const map = new Map<string, HelloWorldFileInfo>();
		for (const file of this.app.vault.getFiles()) {
			const isKgar = determineIfKgarAsync(file);

			map.set(file.path, {
				file,
				isKgar,
			});
		}

		fileStore.set(map);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText("Woah!");
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Settings for my awesome plugin." });

		new Setting(containerEl)
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						console.log("Secret: " + value);
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}

function processKgarBlockquotes(
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) {
	console.log(el);

	function enhance(blockquote: HTMLQuoteElement) {
		if (blockquote instanceof HTMLQuoteElement) {
			const blockquoteFirstChild = blockquote.firstElementChild;
			if (blockquoteFirstChild instanceof HTMLParagraphElement) {
				const firstLineTextNode = blockquoteFirstChild.firstChild;
				if (firstLineTextNode?.nodeType === Node.TEXT_NODE) {
					const text = firstLineTextNode.textContent;
					if (text?.trim().toLocaleLowerCase() === "$kgar") {
						const newNode = document.createElement("span");
						newNode.innerHTML = `<strong>kgar 🌟</strong>`;
						firstLineTextNode.replaceWith(newNode);
					}
				}
			}

			Array.from(blockquote.children).forEach((bChild) => {
				console.log("inspecting blockquote child...", bChild);
				if (bChild instanceof HTMLQuoteElement) {
					console.log("enhancing", bChild);
					enhance(bChild);
				}
			});
		}
	}

	Array.from(el.children).forEach((bChild) => {
		console.log("inspecting child...", bChild);
		if (bChild instanceof HTMLQuoteElement) {
			console.log("enhancing", bChild);
			enhance(bChild);
		}
	});
}

function determineIfKgarAsync(file: TFile): boolean {
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
	if (!frontmatter) {
		return false;
	}
	const key = Object.keys(frontmatter).find(
		(k) => k.toLocaleLowerCase() === "kgar"
	);
	const isKgar = !!key && frontmatter[key] == true;
	return isKgar;
}
