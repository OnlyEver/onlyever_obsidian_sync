import { Plugin, addIcon } from "obsidian";
import { FileManager as Manager } from "./src/FileCollection/FileManager";
import { ObsidianOnlyeverSettingsTab } from "./src/ObsidianOnlyeverSettingsTab";

interface ObsidianOnlyeverSettings {
	apiToken: string;
	tokenValidity: boolean | null;
	syncInterval: any;
}

const DEFAULT_SETTINGS: ObsidianOnlyeverSettings = {
	apiToken: "",
	tokenValidity: false,
	syncInterval: null,
};

export default class MyPlugin extends Plugin {
	settings: ObsidianOnlyeverSettings;
	manager: Manager;

	async onload() {
		this.loadIcons();

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

		this.registerEvent(
			this.app.vault.on("modify", () => {
				this.manager.onActiveFileSaveAction().then();
			})
		);

		this.registerEvent(
			this.app.vault.on("rename", () => {
				this.manager.onActiveFileSaveAction().then();
			})
		);

		this.scheduledSync();

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
				this.manager.fileProcessor.processSingleFile();
			},
		});
	}

	private loadRibbon() {
		const tickIconEl = this.addRibbonIcon(
			"highlighter",
			"Mark for Sync",
			() => {
				this.manager.fileProcessor.markActiveFileForSync();
			}
		);
		tickIconEl.addClass("my-plugin-ribbon-class");

		// const ribbonIconEl = this.addRibbonIcon("cloud", "Sync Notes", () => {
		// 	this.manager.fileProcessor.processFiles();
		// });
		// ribbonIconEl.addClass("my-plugin-ribbon-class");
	}

	private scanVault() {
		this.manager = new Manager(app, this.getSettingsValue());
	}

	private loadIcons(): void {
		addIcon(
			"checkIcon",
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="green"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>'
		);
		addIcon(
			"crossIcon",
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="red"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z"/></svg>'
		);
	}

	private async scheduledSync() {
		const syncIntervalMs = 60 * 60 * 1000;

		this.settings.syncInterval = setInterval(() => {
			this.manager.fileProcessor.processFiles();
			this.saveSettings();
		}, syncIntervalMs);
	}
}
