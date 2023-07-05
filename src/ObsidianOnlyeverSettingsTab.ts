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
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", {
			text: "Settings for Obsidian-Onlyever-Plugin.",
		});

		new Setting(containerEl)
			.setName("PLUGIN TOKEN")
			.setDesc("Enter Plugin Token here")
			.addText((text) =>
				text
					.setPlaceholder("Plugin Token")
					.setValue(this.plugin.settings.apiToken)
					.onChange(async (value) => {
						this.plugin.settings.apiToken = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
