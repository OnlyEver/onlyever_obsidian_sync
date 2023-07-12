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

		this.loadHotKeys();
		this.loadRibbon();

		this.scanVault();

		// uncomment this to make sure that marked files are synced on obsidian open
		this.manager.fileProcessor.processFiles();

		const saveCommandDefinition = (this.app as any).commands?.commands?.[
			"editor:save-file"
		];
		const save = saveCommandDefinition?.callback;

		if (typeof save === "function") {
			saveCommandDefinition.callback = async () => {
				this.manager.onActiveFileSaveAction().then();
			};
		}

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
		this.scanVault();
	}

	getSettingsValue() {
		return this.settings.apiToken;
	}

	private loadHotKeys() {
		this.addCommand({
			id: "add-obsidian-sync-true-in-frontmatter",
			name: "Mark for Sync",
			callback: () => {
				this.manager.fileProcessor.markActiveFileForSync();
			},
		});

		this.addCommand({
			id: "sync-all-obsidian-sync-true-files",
			name: "Sync Notes",
			callback: () => {
				this.manager.fileProcessor.processFiles();
			},
		});
	}

	private loadRibbon() {
		const tickIconEl = this.addRibbonIcon("dice", "Mark for Sync", () => {
			this.manager.fileProcessor.markActiveFileForSync();
		});
		tickIconEl.addClass("my-plugin-ribbon-class");

		const ribbonIconEl = this.addRibbonIcon("cloud", "Sync Notes", () => {
			this.manager.fileProcessor.processFiles();
		});
		ribbonIconEl.addClass("my-plugin-ribbon-class");
	}

	private scanVault() {
		this.manager = new Manager(app, this.getSettingsValue());
	}
}
