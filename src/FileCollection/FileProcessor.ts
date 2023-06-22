import { App, Notice } from "obsidian";
import { FileParser } from "./FileParser";
import { OnlyEverApi } from "../Api/onlyEverApi";

class FileProcessor {
	app: App;
	fileParser: FileParser;
	onlyEverApi: OnlyEverApi;

	constructor(app: App, apiToken: string) {
		this.app = app;
		this.fileParser = new FileParser(app);
		this.onlyEverApi = new OnlyEverApi(apiToken);
	}

	async processFiles() {
		const files = await this.fileParser.getSyncableFiles();
		const processedFiles: object[] = [];

		if (files) {
			for (const file of files) {
				processedFiles.push(await this.fileParser.parseToJson(file));
			}

			const fileId = await this.onlyEverApi.syncFiles(processedFiles);
			let i = 0;

			while (i < files.length) {
				console.log("testing", i, fileId[i]);
				this.fileParser.updateFileId(files[i], fileId[i]);

				i++;
			}
		}
	}

	async processSingleFile() {
		const file = this.app.workspace.getActiveFile();
		const processedFiles: object[] = [];

		if (file) {
			if (this.fileParser.fileHasCustomFlagOnly(file)) {
				processedFiles.push(await this.fileParser.parseToJson(file));
			}

			const fileId = await this.onlyEverApi.syncFiles(processedFiles);
			await this.fileParser.updateFileId(file, fileId.pop());
		}
	}

	async getVaultFilesWithCustomFlag() {
		return await this.fileParser.getSyncableFiles();
	}

	async getCountOfFilesWithCustomFlag() {
		return (await this.getVaultFilesWithCustomFlag()).length;
	}

	getSyncStatusOfCurrentFile(): boolean {
		const file = this.app.workspace.getActiveFile();

		if (file) {
			return this.fileParser.fileHasCustomFlagOnly(file);
		}

		return false;
	}

	async markActiveFileForSync() {
		const file = this.app.workspace.getActiveFile();

		if (file) {
			if (this.fileParser.fileHasCustomFlagOnly(file)) {
				new Notice(
					`Note : ${file.name} has already been marked for sync.`
				);

				return;
			}

			await this.app.fileManager.processFrontMatter(
				file,
				(frontmatter) => {
					frontmatter["obsidianSync"] = true;
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
