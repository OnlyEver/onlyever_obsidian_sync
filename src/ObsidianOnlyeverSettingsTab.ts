import { App, PluginSettingTab, Setting } from "obsidian";
import { OnlyEverApi } from "./Api/onlyEverApi";
import MyPlugin from "../main";

export class ObsidianOnlyeverSettingsTab extends PluginSettingTab {
	plugin: MyPlugin;
	onlyEverApi: OnlyEverApi;
	onlyEverPermanent: OnlyEverApi;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.onlyEverApi = new OnlyEverApi(
			this.plugin.settings.apiToken,
			this.plugin.settings.permanentToken
		);
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
					const identifier =
						await this.onlyEverApi.validateApiToken();
					this.plugin.settings.permanentToken = identifier;
					await this.plugin.saveSettings();
					await this.plugin.loadSettings();
				});
			});
	}
}
