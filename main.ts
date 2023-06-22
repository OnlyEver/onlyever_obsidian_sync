import { Plugin } from "obsidian";
import { FileManager as Manager } from "./src/FileCollection/FileManager";
import { ObsidianOnlyeverSettingsTab } from "./src/ObsidianOnlyeverSettingsTab";

interface ObsidianOnlyeverSettings {
	apiToken: string;
}

const DEFAULT_SETTINGS: ObsidianOnlyeverSettings = {
	apiToken: "",
};

export default class MyPlugin extends Plugin {
	settings: ObsidianOnlyeverSettings;
	manager: Manager;

	async onload() {
		await this.loadSettings();
		this.manager = new Manager(this.app, this.getSettingsValue());

		const ribbonIconEl = this.addRibbonIcon(
			"cloud",
			"Obsidian-Onlyever-plugin",
			() => {
				this.manager.onIconClickAction();
			}
		);
		ribbonIconEl.addClass("my-plugin-ribbon-class");
		// uncomment this to make sure that marked files are synced on onsidian open
		// this.manager.fileProcessor.processFiles();

		const saveCommandDefinition =
			this.app.commands?.commands?.["editor:save-file"];
		const save = saveCommandDefinition?.callback;

		if (typeof save === "function") {
			saveCommandDefinition.callback = async () => {
				this.manager.onActiveFileSaveAction().then();
			};
		}

		this.registerEvent(
			this.app.vault.on("modify", (modifiedFile) => {
				console.log("modify", modifiedFile);
				this.manager.onFileModifyAction(modifiedFile);
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (renamedFile) => {
				this.manager.onFileRenameAction(renamedFile);
			})
		);

		this.addSettingTab(new ObsidianOnlyeverSettingsTab(this.app, this));
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
