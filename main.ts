import { Plugin } from "obsidian";
import { FileManager as Manager } from "./src/FileCollection/FileManager";
import { ObsidianOnlyeverSettingsTab } from "./src/ObsidianOnlyeverSettingsTab";

interface ObsidianOnlyeverSettings {
	apiToken: string;
	permanentToken: string;
}

const DEFAULT_SETTINGS: ObsidianOnlyeverSettings = {
	apiToken: "",
	permanentToken: "",
};

export default class MyPlugin extends Plugin {
	settings: ObsidianOnlyeverSettings;
	manager: Manager;

	async onload() {
		await this.loadSettings();
		this.manager = new Manager(
			this.app,
			this.getSettingsValue(),
			this.getPermanentToken()
		);

		this.loadHotKeys();
		this.loadRibbon();

		// uncomment this to make sure that marked files are synced on obsidian open
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
				// console.log("modify", modifiedFile);
				// this.manager.onFileModifyAction(modifiedFile);
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", (renamedFile) => {
				// this.manager.onFileRenameAction(renamedFile);
			})
		);

		this.addSettingTab(new ObsidianOnlyeverSettingsTab(this.app, this));
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

	getSettingsValue() {
		return this.settings.apiToken;
	}

	private loadHotKeys() {
		this.app.commands.addCommand({
			id: "add-obsidian-sync-true-in-frontmatter",
			name: "[Onlyever]: Add obsidianSync: true in file",
			callback: () => {
				this.manager.fileProcessor.markActiveFileForSync();
			},
		});

		this.app.commands.addCommand({
			id: "sync-all-obsidian-sync-true-files",
			name: "[Onlyever]: Sync all obsidianSync: true files",
			callback: () => {
				this.manager.fileProcessor.processFiles();
			},
		});
	}

	private loadRibbon() {
		const tickIconEl = this.addRibbonIcon(
			"dice",
			"Obsidian-Onlyever-plugin",
			() => {
				this.manager.fileProcessor.markActiveFileForSync();
			}
		);
		tickIconEl.addClass("my-plugin-ribbon-class");

		const ribbonIconEl = this.addRibbonIcon(
			"cloud",
			"Obsidian-Onlyever-plugin",
			() => {
				this.manager.fileProcessor.processFiles();
			}
		);
		ribbonIconEl.addClass("my-plugin-ribbon-class");
	}

	getPermanentToken() {
		return this.settings.permanentToken;
	}
}
