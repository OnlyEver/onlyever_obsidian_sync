import { Plugin } from "obsidian";
import { FileManager as Manager } from "./src/FileCollection/FileManager";

interface MyPluginSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	manager: Manager;

	async onload() {
		await this.loadSettings();

		this.manager = new Manager(this.app);

		const saveCommandDefinition = (this.app as any).commands?.commands?.[
			"editor:save-file"
		];
		const save = saveCommandDefinition?.callback;

		if (typeof save === "function") {
			saveCommandDefinition.callback = async () => {
				this.manager.onFileSaveAction();
				save.apply(this.app);
			};
		}

		this.registerEvent(
			this.app.vault.on("create", (deletedFile) => {
				this.manager.onFileCreateAction(deletedFile);
			})
		);

		this.registerEvent(
			this.app.vault.on("modify", (modifiedFile) => {
				this.manager.onFileModifyAction(modifiedFile);
			})
		);

		this.registerEvent(
			this.app.vault.on("delete", (deletedFile) => {
				this.manager.onFileDeleteAction(deletedFile);
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (renamedFile) => {
				this.manager.onFileRenameAction(renamedFile);
			})
		);
	}

	// onunload() {

	// }

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
}

// class SampleModal extends Modal {
// 	constructor(app: App) {
// 		super(app);
// 	}

// 	onOpen() {
// 		const {contentEl} = this;
// 		contentEl.setText('Woah!');
// 	}

// 	onClose() {
// 		const {contentEl} = this;
// 		contentEl.empty();
// 	}
// }

// class SampleSettingTab extends PluginSettingTab {
// 	plugin: MyPlugin;

// 	constructor(app: App, plugin: MyPlugin) {
// 		super(app, plugin);
// 		this.plugin = plugin;
// 	}

// 	display(): void {
// 		const {containerEl} = this;

// 		containerEl.empty();

// 		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

// 		new Setting(containerEl)
// 			.setName('Setting #1')
// 			.setDesc('It\'s a secret')
// 			.addText(text => text
// 				.setPlaceholder('Enter your secret')
// 				.setValue(this.plugin.settings.mySetting)
// 				.onChange(async (value) => {
// 					console.log('Secret: ' + value);
// 					this.plugin.settings.mySetting = value;
// 					await this.plugin.saveSettings();
// 				}));
// 	}
// }
