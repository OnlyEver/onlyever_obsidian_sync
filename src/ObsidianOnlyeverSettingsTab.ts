import { App, PluginSettingTab, Setting } from "obsidian";
import { OnlyEverApi } from "./Api/onlyEverApi";
import MyPlugin from "../main";

export class ObsidianOnlyeverSettingsTab extends PluginSettingTab {
	plugin: MyPlugin;
	onlyEverApi: OnlyEverApi;

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

		new Setting(containerEl)
			.setName("API TOKEN")
			.setDesc("Enter API Token here")
			.addText((text) =>
				text
					.setPlaceholder("API Key goes here")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value;
						await this.plugin.saveSettings();
					})
			)
			.addButton((button) => {
				button.setButtonText("Validate token").onClick(async () => {
					this.onlyEverApi.validateApiToken();
				});
			});
	}
}
