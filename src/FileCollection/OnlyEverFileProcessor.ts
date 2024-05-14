import {App, TFile} from "obsidian";
import {OnlyEverFileParser} from "./OnlyEverFileParser";
import {OnlyEverApi} from "../Api/onlyEverApi";
import {OeToast} from "../OeToast";
import {OnlyEverSettings} from "../interfaces";

class OnlyEverFileProcessor {
	app: App;
	fileParser: OnlyEverFileParser;
	onlyEverApi: OnlyEverApi;
	settings: OnlyEverSettings;
	apiToken: string;

	constructor(app: App, settings: OnlyEverSettings) {
		this.app = app;
		this.fileParser = new OnlyEverFileParser(app);
		this.settings = settings
		this.apiToken = settings.apiToken;
		this.onlyEverApi = new OnlyEverApi(this.apiToken);
	}

	/*
	 * Syncs all marked files in vault
	 */
	async processMarkedFiles(setting: OnlyEverSettings) {
		const files = await this.fileParser.getSyncableFiles();
		const processedFiles: object[] = [];

		if (files.length === 0) {
			new OeToast("No files marked for sync in the vault.");
			return false;
		}

		if(!this.isValid()){ return false }

		for (const file of files) {
			processedFiles.push(
				await this.fileParser.parseFileToOeGlobalSourceJson(setting, file, file?.parent, this.apiToken)
			);
		}

		return await this.onlyEverApi.syncFiles(processedFiles);
	}

	/*
	 * Syncs active marked file in vault
	 */
	async processSingleFile(setting: OnlyEverSettings, file: null | TFile = null) {
		file = file ?? this.app.workspace.getActiveFile();
		const processedFiles: object[] = [];

		if (!file) {
			new OeToast("No note is open.");

			return false;
		}

		if (await this.fileParser.fileHasSyncFlag(file)) {
            if(!this.isValid()){ return false }

            processedFiles.push(await this.fileParser.parseFileToOeGlobalSourceJson(setting, file, file?.parent, this.apiToken));

            return await this.onlyEverApi.syncFiles(processedFiles);
        }

		return false
	}

	/*
	 * Checks if file has been marked for sync.
	 */
	async activeFileHasSyncFlag(): Promise<boolean> {
		const file = this.app.workspace.getActiveFile() ?? false;

		if (file) {
			return await this.fileParser.fileHasSyncFlag(file);
		}

		return file;
	}

	/*
	 * Adds markForSyncFlag to file
	 */
	async markActiveFileForSync() {
		const file = this.app.workspace.getActiveFile();

		if (file) {
			let markType = true;

			if (await this.fileParser.fileHasSyncFlag(file)) {
				markType = false;
			}

			await this.app.fileManager.processFrontMatter(
				file,
				(frontmatter) => {
					frontmatter["oe_sync"] = markType;
				}
			);

			return;
		}

		new OeToast("You need to open a note to mark it.");
		return;
	}

	isValid(){
		if(this.settings.apiToken.length === 0){
			new OeToast(`Note sync failed. Please ensure you've entered the API token.`)
			return false;
		}

		if(this.settings.tokenValidity === null){
			new OeToast(`Note sync failed. Please ensure you've validated the API token.`)
			return false;
		}

		if(!this.settings.tokenValidity){
			new OeToast(`Note sync failed. Please use a valid API token.`)
			return false;
		}

		return true;
	}
}

export { OnlyEverFileProcessor };
