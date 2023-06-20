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

		// const saveCommandDefinition = this.app.commands?.commands?.[
		// 	"editor:save-file"
		// ];
		//
		// console.log('apple', saveCommandDefinition);
		// const save = saveCommandDefinition?.callback;
		//
		// if (typeof save === "function") {
		// 	saveCommandDefinition.callback = async () => {
		// 		this.manager.onActiveFileSaveAction()
		// 	};
		// }
		//
		// const saveCommandDefinition = (this.app as any).commands?.commands?.[
		// 	"editor:save-file"
		// ];
		// const save = saveCommandDefinition?.callback;
		//
		// if (typeof save === "function") {
		// 	saveCommandDefinition.callback = async () => {
		// 		this.manager.onActiveFileSaveAction();
		// 		save.apply(this.app);
		// 		// console.log("Api TOKEN");
		// 		// console.log(this.getSettingsValue());
		// 	};
		// }

		this.registerEvent(
			this.app.vault.on("create", (createdFile) => {
				this.manager.onFileCreateAction(createdFile);
			})
		);

		this.registerEvent(
			this.app.vault.on("modify", (modifiedFile) => {
				console.log("modify", modifiedFile);
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
