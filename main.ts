import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";
import { FileManager as Manager } from "./src/FileCollection/FileManager";

interface MyPluginSettings {
	apiToken: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	apiToken: "",
};

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	manager: Manager;

	async onload() {
		await this.loadSettings();

		const ribbonIconEl = this.addRibbonIcon(
			"cloud",
			"Obsidian-Onlyever-plugin",
			(evt: MouseEvent) => {
				new Notice("You are using Obsidian Onlyever plugin");
				this.manager.onIconCLickAction();
			}
		);

		ribbonIconEl.addClass("my-plugin-ribbon-class");

		this.manager = new Manager(this.app);

		const saveCommandDefinition = (this.app as any).commands?.commands?.[
			"editor:save-file"
		];
		const save = saveCommandDefinition?.callback;

		if (typeof save === "function") {
			saveCommandDefinition.callback = async () => {
				this.manager.onActiveFileSaveAction();
				save.apply(this.app);
				console.log("Api TOKEN");
				console.log(this.getSettingsValue());
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

		this.addSettingTab(new SampleSettingTab(this.app, this));
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

	getSettingsValue(): string {
		return this.settings.apiToken;
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
		containerEl.createEl("h2", {
			text: "Settings for Obsidian-Onlyever-Plugin.",
		});

		new Setting(containerEl)
			.setName("API TOKEN")
			.setDesc("Enter API Token here")
			.addText((text) =>
				text
					.setPlaceholder("API Key goes here")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						// I think onchange ma each time token verification garna parla
						this.plugin.settings.apiToken = value;
						console.log("verfifying token...?");
						await this.plugin.saveSettings();
					})
			);
	}
}
