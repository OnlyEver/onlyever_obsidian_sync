import { Plugin, addIcon, TFile, debounce } from "obsidian";
import { OnlyEverFileManager as Manager } from "./src/FileCollection/OnlyEverFileManager";
import { OnlyEverSettingsTab } from "./src/OnlyEverSettingsTab";
import { OnlyEverSettings, WasEditedMap } from "./src/interfaces";

const DEFAULT_SETTINGS: OnlyEverSettings = {
	apiToken: "",
	tokenValidity: false,
	syncInterval: null,
	userId: null,
};


export default class OnlyEverPlugin extends Plugin {
	settings: OnlyEverSettings;
	oeFileManager: Manager;

	previousTab: TFile;
	activeTab: TFile;
	wasEdited: WasEditedMap = {}
	timeout = 2500;

	async onload() {
		this.loadIcons();
		await this.loadSettings();

		this.loadHotKeys();
		this.loadRibbon();
		this.scanVault();
		this.registerAllEvents();

		this.scheduledSync();
		this.addSettingTab(new OnlyEverSettingsTab(this.app, this));
		this.setPreviousAndActiveTab();
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

	private loadHotKeys() {
		this.addCommand({
			id: "add-obsidian-sync-true-in-frontmatter",
			name: "Mark for Sync",
			callback: () => {
				this.oeFileManager.fileProcessor.markActiveFileForSync();
			},
		});

		this.addCommand({
			id: "sync-all-obsidian-sync-true-files",
			name: "Sync Notes",
			callback: () => {
				this.oeFileManager.fileProcessor.processMarkedFiles(this.settings);
			},
		});
	}

	private loadRibbon() {
		const tickIconEl = this.addRibbonIcon(
			"highlighter",
			"Mark for Sync",
			() => {
				this.oeFileManager.fileProcessor.markActiveFileForSync();
			}
		);
		tickIconEl.addClass("my-plugin-ribbon-class");
	}

	private scanVault() {
		this.oeFileManager = new Manager(this.app, this.settings);
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
			this.oeFileManager.fileProcessor.processMarkedFiles(this.settings);
			this.saveSettings();
		}, syncIntervalMs);
	}

	/**
	 * Note by: @PG-Momik
	 * Obsidian's default 'modify' event is 'throttled' not 'debounced' (I Think)
	 * The event delay is 2 seconds.
	 * So we set the debounce interval to time greater than the throttle interval.
	 */
	debouncedSync = debounce(async (file: TFile) => {
		console.log('debounce sync vitra');
		if(this.oeFileManager.isSupportedFile(file)){
			console.log('i will sync now');
			await this.oeFileManager.fileProcessor.processSingleFile(this.settings, file);
			this.timeout = 2500;
		}
	}, this.timeout, true)

	debouncedSave = debounce((file: TFile)=>{
		this.timeout = 0
		this.wasEdited[file.path] = false;
		this.debouncedSync(file);
	}, 500, true);

	/**
	 * Register event and functionality on event
	 */
	private registerAllEvents(): void {

		/**
		 * Registers and handles initial Obsidian open event
		 */
		this.registerEvent(
			// @ts-ignore
			// IDE SHOWING ERROR DESPITE THIS CODE WORKING.
			this.app.workspace.on("layout-ready",
				() => {
					this.oeFileManager.fileProcessor.processMarkedFiles(this.settings).then();
				}
			)
		);

		/*
		 * Registers and handles active note edit event
		 */
		this.registerEvent(
			this.app.vault.on("modify",
			async (file) => {
					if (file instanceof TFile) {
						this.debouncedSync(file as TFile);
					}
				}
			)
		);

		/**
		 * Registers and handles vault's note rename event.
		 */
		this.registerEvent(
			this.app.vault.on("rename",
			() => {
					this.oeFileManager.onActiveFileSaveAction(this.settings).then();
				}
			)
		);

		/**
		 * Registers and handles note save event.
		 */
		const saveCommandDefinition = (this.app as any).commands?.commands?.["editor:save-file"];
		const save = saveCommandDefinition?.callback;

		if (typeof save === "function") {
			saveCommandDefinition.callback = async () => {
				this.debouncedSave(this.activeTab);
			};
		}

		/**
		 * Registers and handles tab switch event.
		 */
		this.registerEvent(
			this.app.workspace.on('active-leaf-change',
				async () => {
					if (this.oeFileManager.isActualTabChanged(this.previousTab)) {
						if (this.oeFileManager.fileWasEdited(this.wasEdited, this.previousTab) && this.oeFileManager.isSupportedFile(this.previousTab)) {
							this.debouncedSync(this.previousTab);
						}

						this.setPreviousAndActiveTab();
						this.wasEdited[this.activeTab.path] = false;
					}
				}
			)
		);
	}

	/**
	 * Set previousTab and activeTab to current open file.
	 */
	private setPreviousAndActiveTab(): void {
		const openFileOnAppOpen  = this.app.workspace.getActiveFile()

		if(openFileOnAppOpen){
			this.previousTab = this.activeTab = openFileOnAppOpen
		}
	}
}
