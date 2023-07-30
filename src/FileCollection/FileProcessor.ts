import { App, Notice } from "obsidian";
import { FileParser } from "./FileParser";
import { OnlyEverApi } from "../Api/onlyEverApi";

class FileProcessor {
	app: App;
	fileParser: FileParser;
	onlyEverApi: OnlyEverApi;
	apiToken: string;
	imagePath: string;

	constructor(app: App, apiToken: string, imagePath:string) {
		this.app = app;
		this.fileParser = new FileParser(app,imagePath);
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
			processedFiles.push(
				await this.fileParser.parseToJson(file, file?.parent, this.onlyEverApi.apiToken)
			);
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

		if (await this.fileParser.fileHasSyncFlag(file)) {
			processedFiles.push(
				await this.fileParser.parseToJson(file, file?.parent, this.onlyEverApi.apiToken)
			);
			
			await this.onlyEverApi.syncFiles(processedFiles);
		}
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

		new Notice("You need to open a note to mark it.");
		return;
	}
}

export { FileProcessor };
