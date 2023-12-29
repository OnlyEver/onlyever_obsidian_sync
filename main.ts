import {Plugin, addIcon, TFile, debounce} from "obsidian";
import { OnlyEverFileManager as Manager } from "./src/FileCollection/OnlyEverFileManager";
import { OnlyEverSettingsTab } from "./src/OnlyEverSettingsTab";
import {OeSyncResponseData, OnlyEverSettings} from "./src/interfaces";
import {OverrideConfirmationPopup} from "./src/OverrideConfirmationPopup";


const DEFAULT_SETTINGS: OnlyEverSettings = {
	apiToken: "",
	tokenValidity: false,
	syncInterval: null,
	userId: null,
};


export default class OnlyEverPlugin extends Plugin {
	settings: OnlyEverSettings;
	oeFileManager: Manager;
	previousTab: null | TFile = null;
	wasEdited: any = {}

	async onload() {
		this.loadIcons();
		await this.loadSettings();

		this.loadHotKeys();
		this.loadRibbon();
		this.scanVault();
		this.registerAllEvents();

		this.oeFileManager.fileProcessor.processMarkedFiles(this.settings).then((result) => {
			this.overwriteWorkflow(result)
		})

		this.scheduledSync();
		this.addSettingTab(new OnlyEverSettingsTab(this.app, this));
		this.previousTab = this.app.workspace.getActiveFile()
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
				this.oeFileManager.fileProcessor.markActiveFileForSync();
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
			this.oeFileManager.fileProcessor.processMarkedFiles(this.settings).then((result) => {
				this.overwriteWorkflow(result)
			});
			this.saveSettings();
		}, syncIntervalMs);
	}

	/*
	 * Registers event and functionality on event
	 */
	private registerAllEvents() {

		const debouncedSync = debounce(() => {
			this.oeFileManager.fileProcessor.processSingleFile(this.settings, this.previousTab)
		}, 3200, true)

		/*
		 * Registers and handles initial Obsidian open event
		 */
		this.registerEvent(
			// @ts-ignore
			this.app.workspace.on("layout-ready", () => {
				this.oeFileManager.fileProcessor.processMarkedFiles(this.settings).then((result) => {
					this.overwriteWorkflow(result)
				});

				/*
				 * Registers and handles active note edit event
				 */
				this.registerEvent(
					this.app.vault.on("modify", () => {
						debouncedSync.cancel()
						debouncedSync();
					})
				);

				/*
				 * Registers and handles vault's note rename event
				 */
				this.registerEvent(
					this.app.vault.on("rename", (file, oldPath) => {
						const pathSegments = oldPath.split("/");
						const oldName = pathSegments[pathSegments.length - 1]
						const lastDotIndex = oldName.lastIndexOf('.');
						// @ts-ignore
						file.tempTitle = lastDotIndex !== -1 ? oldName.substring(0, lastDotIndex) : oldName

						this.oeFileManager.fileProcessor.processSingleFile(this.settings, file as TFile, true).then((result) => {
							this.overwriteWorkflow(result)
						})
					})
				);

				/*
				 * Registers and handles note save event
				 */
				const saveCommandDefinition = (this.app as any).commands?.commands?.["editor:save-file"];
				const save = saveCommandDefinition?.callback;

				if (typeof save === "function") {
					saveCommandDefinition.callback = async () => {
						this.oeFileManager.onActiveFileSaveAction(this.settings).then((result) => {
							this.overwriteWorkflow(result)
						});
					};
				}
			})
		);
	}

	overwriteWorkflow(result:false|OeSyncResponseData){
		if (result && result.replacementNotes.length !== 0) {
			new OverrideConfirmationPopup(this.app, result.replacementNotes, this.settings.apiToken).open()
		}

		this.registerEvent(
			this.app.workspace.on('active-leaf-change', () => {
				if(this.previousTab){
					const prev = this.previousTab;
					if(this.wasEdited[prev.name]){
						this.debouncedSync.cancel()
						this.oeFileManager.fileProcessor.processSingleFile(this.settings, this.previousTab)

						this.previousTab = this.app.workspace.getActiveFile()
						this.wasEdited[prev.name] = false
					}
				}
			})
		);
	}
}
