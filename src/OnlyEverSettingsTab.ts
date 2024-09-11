import {
	App, debounce, DropdownComponent,
	ExtraButtonComponent,
	PluginSettingTab,
	Setting,
	TextComponent,
} from "obsidian";
import {OnlyEverApi} from "./Api/onlyEverApi";
import OnlyEverPlugin from "../main";
import {container} from "webpack";
import {OeSimpleFolderType} from "./interfaces";

export class OnlyEverSettingsTab extends PluginSettingTab {
	plugin: OnlyEverPlugin;
	onlyEverApi: OnlyEverApi;
	onlyEverPermanent: OnlyEverApi;

	constructor(app: App, plugin: OnlyEverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.onlyEverApi = new OnlyEverApi(this.plugin.settings.apiToken);
	}

	async display(): Promise<void> {
		const {containerEl} = this;

		containerEl.empty();
		containerEl.createEl("h2", {
			text: "Settings for Obsidian-Onlyever-Plugin.",
		});

		let textElement: TextComponent;
		let validityElement: ExtraButtonComponent;
		let userFolders: OeSimpleFolderType[] = [];

		const debouncedTokenVerification = debounce((value: string) => {
			this.onlyEverApi.validateApiToken(value).then(async (result) => {
				this.plugin.settings.tokenValidity = null
				this.plugin.settings.userId = null

				if (result.status) {
					validityElement.setIcon("checkIcon");

					tokenErrorDiv.innerText = "";
					folderErrorDiv.innerText = "";

					this.plugin.settings.tokenValidity = result.status
					this.plugin.settings.userId = result.userId

					document.querySelector('.folder-selection')?.classList.remove('disable')
				} else if (!result["status"]) {
					validityElement.setIcon("crossIcon");

					tokenErrorDiv.addClass("error");
					tokenErrorDiv.innerText = value.length > 0 ? "The PLUGIN TOKEN is incorrect." : "";

					folderErrorDiv.addClass("error");
					folderErrorDiv.innerText = value.length > 0 ? "Enter valid PLUGIN TOKEN to use this feature." : "";

					document.querySelector('.folder-selection')?.classList.add('disable')
				}

				await this.plugin.saveSettings()
			})
		}, 150, true)

		this.showLoader(containerEl);

		if(this.plugin.settings.tokenValidity){
			userFolders = await this.onlyEverApi.getUserFolders(this.onlyEverApi.apiToken);
		}

		this.hideLoader(containerEl);

		/** Token field section */
		new Setting(containerEl)
			.setClass("plugin-input")
			.setName("PLUGIN TOKEN")
			.setDesc("Enter Plugin Token here")
			.addText((text) => {
				textElement = text as TextComponent;
				text.setPlaceholder("Plugin Token")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value;
						this.plugin.settings.tokenValidity = null;

						if (value.length && value != "") {
							debouncedTokenVerification(value)
						}

						if (!text.getValue().length || text.getValue() === null) {
							tokenErrorDiv.innerText = "";
							validityElement.setIcon("circle-slash");
						}

						await this.plugin.saveSettings();
					});
			})
			.addExtraButton((extra) => {
				validityElement = extra as ExtraButtonComponent;
				validityElement.setIcon("circle-slash").extraSettingsEl;

				if (this.plugin.settings.tokenValidity) {
					extra.setIcon("checkIcon");
				} else if (
					this.plugin.settings.tokenValidity === false &&
					this.plugin.settings.apiToken.length > 0
				) {
					extra.setIcon("crossIcon");
				}
			})
			.addToggle((toggle) => {
				textElement.inputEl.setAttribute("type", "password");

				toggle.setValue(false).onChange(async (value) => {
					if (value) {
						textElement.inputEl.setAttribute("type", "text");
					} else {
						textElement.inputEl.setAttribute("type", "password");
					}
				});
			});

		const tokenErrorDiv = containerEl.createEl("div");

		/** Folder dropdown section */
		new Setting(containerEl)
			.setClass("folder-selection")
			.setName('PREFERRED FOLDER')
			.setDesc('Select the folder you want to sync your notes to')
			.addDropdown(async (dropdown) => {
				const populateDropdown = async () => {
					let defaultFolderId: string | null = null;

					userFolders.forEach((folder: OeSimpleFolderType) => {
						const folderId = Object.keys(folder)[0];
						const folderName = folder[folderId];

						if (folderName === 'Library') {
							defaultFolderId = folderId;
						}

						dropdown.addOption(folderId, folderName);
					});

					const preferredFolder = (await this.plugin.loadData()).preferredFolder;
					const preferredFolderId = preferredFolder ? Object.keys(preferredFolder)[0] : null;

					dropdown.setValue(preferredFolderId || defaultFolderId || '');
				};

				await populateDropdown();

				dropdown.onChange(async (selectedFolderId) => {
					const selectedFolder = userFolders.find(folder => Object.keys(folder)[0] === selectedFolderId);

					if (selectedFolder) {
						this.plugin.settings.preferredFolder = selectedFolder;
						await this.plugin.saveSettings();
					}
				});
			});

		const folderErrorDiv = containerEl.createEl("div");
	}

	private showLoader(containerEl: HTMLElement): void {
		const loaderParent = containerEl.createEl("div", {cls: 'loader-parent'});
		const loaderBarWrapper = containerEl.createEl("div", {cls: "loader-container"});
		const loaderBar = containerEl.createEl("div", {cls: "loader"});
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
}
