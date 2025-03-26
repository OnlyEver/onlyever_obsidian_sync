import {
	App, debounce, Debouncer, DropdownComponent,
	ExtraButtonComponent,
	PluginSettingTab,
	Setting,
	TextComponent, TFolder,
} from "obsidian";
import { OnlyEverApi } from "./Api/onlyEverApi";
import OnlyEverPlugin from "../main";
import { OeSimpleFolderType } from "./interfaces";
import { Arr } from "tern";

export class OnlyEverSettingsTab extends PluginSettingTab {
	plugin: OnlyEverPlugin;
	onlyEverApi: OnlyEverApi;
	private validityElement: ExtraButtonComponent;
	private userFolders: OeSimpleFolderType[] = [{ 'library': 'Library' }];
	private dropdown: DropdownComponent;
	private preferredFolder: null | OeSimpleFolderType;
	private tokenErrorDiv: HTMLDivElement;
	private folderErrorDiv: HTMLDivElement;

	constructor(app: App, plugin: OnlyEverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.onlyEverApi = new OnlyEverApi(this.plugin.settings.apiToken);
		this.preferredFolder = this.plugin.settings.preferredFolder;

		this.watchApiToken();
		this.watchTokenValidity();

		if (this.plugin.settings.apiToken && this.plugin.settings.tokenValidity) {
			this.onlyEverApi.getUserFolders(this.plugin.settings.apiToken).then((userFolders) => {
				this.userFolders = userFolders;
			})
		} else if (this.preferredFolder) {
			this.userFolders = [this.preferredFolder]
		}
	}

	/**
	 * This method does not need to be explicitly called. It'll be auto invoked when opening the OE Settings tab.
	 */
	async display(): Promise<void> {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "Settings for Obsidian-Onlyever-Plugin." });

		const debouncedTokenVerification = debounce((value: string) => {
			this.onlyEverApi.validateApiToken(value).then(async (result) => {
				this.plugin.settings.tokenValidity = null
				this.plugin.settings.userId = null

				if (result.status) {
					this.updateFolderSectionState();
					this.validityElement.setIcon("checkIcon");

					this.tokenErrorDiv.innerText = "";
					this.folderErrorDiv.innerText = "";

					this.plugin.settings.tokenValidity = result.status
					this.plugin.settings.userId = result.userId
					this.folderSectionEnable()
				} else if (!result["status"]) {
					this.validityElement.setIcon("crossIcon");

					this.tokenErrorDiv.addClass("error");
					this.tokenErrorDiv.innerText = value.length > 0 ? "The PLUGIN TOKEN is incorrect." : "";

					this.folderErrorDiv.addClass("error");
					this.folderErrorDiv.innerText = value.length >= 0 ? "Enter valid PLUGIN TOKEN to use this feature." : "";

					this.folderSectionDisable()
				}

				await this.plugin.saveSettings()
			})
		}, 150, true)

		this.renderTokenSettingSection(containerEl, debouncedTokenVerification);
		this.renderFolderSettingSection(containerEl);
		this.updateFolderSectionState();
	}

	private renderTokenSettingSection(containerEl: HTMLElement, debouncedTokenVerification: Debouncer<[value: string], void>) {
		let textElement: TextComponent;

		new Setting(containerEl)
			.setClass("plugin-input")
			.setName("PLUGIN TOKEN")
			.setDesc("Enter plugin token")
			.addText((text) => {
				textElement = text;

				text.setPlaceholder("Plugin Token")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value;
						this.plugin.settings.tokenValidity = null;

						value ? debouncedTokenVerification(value) : this.validityElement.setIcon("circle-slash");
						await this.plugin.saveSettings();
					});
			})
			.addExtraButton((extra) => {
				this.validityElement = extra.setIcon("circle-slash");

				if (this.plugin.settings.tokenValidity) {
					extra.setIcon("checkIcon");
				} else if (this.plugin.settings.tokenValidity === false && this.plugin.settings.apiToken) {
					extra.setIcon("crossIcon");
				}
			})
			.addToggle((toggle) => {
				textElement.inputEl.setAttribute("type", "password");
				toggle.setValue(false).onChange((value) => {
					textElement.inputEl.setAttribute("type", value ? "text" : "password");
				});
			});

		containerEl.createEl("div", { cls: "token-error" });

		this.tokenErrorDiv = containerEl.createEl('div');
	}

	private renderFolderSettingSection(containerEl: HTMLElement) {
		new Setting(containerEl)
			.setClass("folder-selection")
			.setName('PREFERRED FOLDER')
			.setDesc('Select the folder you want to sync your notes to')
			.addDropdown(async (dropdown) => {
				this.dropdown = dropdown;

				await this.populateDropdown();

				this.dropdown.onChange(async (selectedFolderId) => {
					const selectedFolder = this.userFolders.find(folder => this.getKeyFromOeSimpleFolder(folder) === selectedFolderId);

					if (selectedFolder) {
						this.plugin.settings.preferredFolder = selectedFolder;
						this.preferredFolder = selectedFolder;
						await this.plugin.saveSettings();
					}
				});
			})
			.addExtraButton((button) => {
				button.setIcon('refresh-cw').setTooltip('Refresh Folders').onClick(async () => {
					this.userFolders = await this.onlyEverApi.getUserFolders(this.plugin.settings.apiToken)

					await this.populateDropdown();
				});
			});

		this.folderErrorDiv = containerEl.createEl('div');
	}

	async populateDropdown() {
		let userLibraryId: false | string = false;
		const optionsLength = this.dropdown.selectEl.length;

		/**
		 * This will remove all options from the dropdown
		 * I'm doing this since there's no native API to remove options from dropdown
		 */
		for (let i = 0; i < optionsLength; i++) {
			this.dropdown.selectEl.options.remove(0);
		}

		this.userFolders.forEach((folder: OeSimpleFolderType) => {
			const folderId = this.getKeyFromOeSimpleFolder(folder);
			const folderName = folder[folderId];

			if (folderName === 'Library') {
				userLibraryId = folderId;
			}

			this.dropdown.addOption(folderId, folderName);
		});

		/**
		 * I'm doing this to handle a case when we have to select a dropdown option.
		 * Given that we have 2 options for library (one dummy 'Library' and another is actual user 'Library')
		 * So basically I'm selecting the option by precedence of:
		 * 	1. preferred folder (already selected folder)
		 *  2. user's library folder
		 *  3. dummy/default library folder.
		 *  With this we can ensure that one valid folder is selected when opening the settings tab.
		 */
		let setThisId = 'library';

		if (this.preferredFolder && this.preferredFolderExistsInUserFolder(this.preferredFolder, this.userFolders)) {
			setThisId = this.getKeyFromOeSimpleFolder(this.preferredFolder);
		} else if (userLibraryId) {
			setThisId = userLibraryId
		}

		this.dropdown.setValue(setThisId);
	}

	private showLoader(containerEl: HTMLElement): void {
		const loaderParent = containerEl.createEl("div", { cls: 'loader-parent' });
		const loaderBarWrapper = containerEl.createEl("div", { cls: "loader-container" });
		const loaderBar = containerEl.createEl("div", { cls: "loader" });
		loaderBarWrapper.appendChild(loaderBar);

		const loaderText = containerEl.createEl("div", {
			cls: "text-white font-bold loader-container",
			text: "Loading assets ...",
		});
		loaderParent.appendChild(loaderBarWrapper);
		loaderParent.appendChild(loaderText);

		containerEl.appendChild(loaderParent);
	}

	private hideLoader(containerEl: HTMLElement): void {
		const loaderParent = containerEl.querySelector(".loader-parent");
		if (loaderParent) {
			loaderParent.remove();
		}
	}

	private folderSectionDisable() {
		document.querySelector('.folder-selection')?.classList.add('disable')

	}

	private folderSectionEnable() {
		document.querySelector('.folder-selection')?.classList.remove('disable')
	}

	private getKeyFromOeSimpleFolder(oeSimpleFolder: OeSimpleFolderType) {
		return Object.keys(oeSimpleFolder)[0];
	}

	private watchApiToken() {
		let currentToken = this.plugin.settings.apiToken;
		Object.defineProperty(this.plugin.settings, 'apiToken', {
			get: () => currentToken,
			set: (value) => {
				currentToken = value;
				this.updateFolderSectionState();
			}
		});
	}

	private watchTokenValidity() {
		let currentValidity = this.plugin.settings.tokenValidity;
		Object.defineProperty(this.plugin.settings, 'tokenValidity', {
			get: () => currentValidity,
			set: (value) => {
				currentValidity = value;
				this.updateFolderSectionState();
			}
		});
	}

	/**
	 *  This method checks the state of apiToken and tokenValidity
	 *  - If both are okay, enables the folder selection section.
	 *  - Else disables the folder selection section
	 */
	private updateFolderSectionState() {
		const { apiToken, tokenValidity } = this.plugin.settings;
		if (apiToken && tokenValidity) {
			this.onlyEverApi.getUserFolders(this.plugin.settings.apiToken).then((userFolders) => {
				this.userFolders = userFolders;
				this.populateDropdown().then(() => this.folderSectionEnable())
			})
		} else {
			this.folderSectionDisable();
		}
	}

	/**
	 * Basically checks if preferred folder exists in user-folders
	 * .
	 * @param preferredFolder
	 * @param userFolders
	 * @private
	 */
	private preferredFolderExistsInUserFolder(preferredFolder: OeSimpleFolderType, userFolders: Array<OeSimpleFolderType>): boolean {
		return userFolders.some(folder =>
			Object.entries(preferredFolder).every(([key, value]) => folder[key] === value)
		);
	}
}
