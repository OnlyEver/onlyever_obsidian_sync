import { App, Notice } from "obsidian";
import { FileParser } from "./FileParser";
import { OnlyEverApi } from "../Api/onlyEverApi";

class FileProcessor {
	app: App;
	fileParser: FileParser;
	onlyEverApi: OnlyEverApi;
	apiToken: string;

	constructor(app: App, apiToken: string) {
		this.app = app;
		this.fileParser = new FileParser(app);
		this.apiToken = apiToken;
		this.onlyEverApi = new OnlyEverApi(apiToken);
	}

	/*
	 * Syncs all marked files in vault
	 */
	async processFiles() {
		const files = await this.fileParser.getSyncableFiles();
		const processedFiles: object[] = [];

		if (files.length == 0) {
			new Notice("No files in the vault");
			return false;
		}

		for (const file of files) {
			processedFiles.push(await this.fileParser.parseToJson(file));
		}

		await this.onlyEverApi.syncFiles(processedFiles);

		return true;
	}

	/*
	 * Syncs active marked file in vault
	 */
	async processSingleFile() {
		const file = this.app.workspace.getActiveFile();
		const processedFiles: object[] = [];

		if (!file) {
			new Notice("No note is open.");
			return;
		}

		if (this.fileParser.fileHasSyncFlag(file)) {
			processedFiles.push(await this.fileParser.parseToJson(file));
			await this.onlyEverApi.syncFiles(processedFiles);
		}
	}

	/*
	 * Checks if file has been marked for sync.
	 */
	activeFileHasSyncFlag(): boolean {
		const file = this.app.workspace.getActiveFile() ?? false;

		if (file) {
			return this.fileParser.fileHasSyncFlag(file);
		}

		return file;
	}

	/*
	 * Adds markForSyncFlag to file
	 */
	async markActiveFileForSync() {
		const file = this.app.workspace.getActiveFile();

		if (file) {
			if (this.fileParser.fileHasSyncFlag(file)) {
				new Notice(
					`Note : ${file.name} has already been marked for sync.`
				);

				return;
			}

			await this.app.fileManager.processFrontMatter(
				file,
				(frontmatter) => {
					frontmatter["oe_sync"] = true;
				}
			);
			new Notice(`Note : ${file.name} has been marked for sync.`);

			return;
		}

		new Notice("You need to open a note to mark it.");
		return;
	}
}

export { FileProcessor };
