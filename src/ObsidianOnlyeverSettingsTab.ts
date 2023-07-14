import {
	App,
	ExtraButtonComponent,
	PluginSettingTab,
	Setting,
	TextComponent,
} from "obsidian";
import { OnlyEverApi } from "./Api/onlyEverApi";
import MyPlugin from "../main";

export class ObsidianOnlyeverSettingsTab extends PluginSettingTab {
	plugin: MyPlugin;
	onlyEverApi: OnlyEverApi;
	onlyEverPermanent: OnlyEverApi;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.onlyEverApi = new OnlyEverApi(this.plugin.settings.apiToken);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", {
			text: "Settings for Obsidian-Onlyever-Plugin.",
		});
		let textElement: TextComponent;
		let validityElement: ExtraButtonComponent;

		new Setting(containerEl)
			.setName("PLUGIN TOKEN")
			.setDesc("Enter Plugin Token here")
			.addText((text) => {
				textElement = text as TextComponent;
				text.setPlaceholder("Plugin Token")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value;
						const result = await this.onlyEverApi.validateApiToken(
							value
						);

						this.plugin.settings.tokenValidity = !!result;

						if (result) {
							validityElement.setIcon("check-circle-2");
						} else {
							validityElement.setIcon("x-circle");
						}

						await this.plugin.saveSettings();
					});
			})
			.addExtraButton((extra) => {
				validityElement = extra as ExtraButtonComponent;
				if (this.plugin.settings.tokenValidity) {
					extra.setIcon("check-circle-2");
				} else {
					extra.setIcon("x-circle");
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
	}
}
