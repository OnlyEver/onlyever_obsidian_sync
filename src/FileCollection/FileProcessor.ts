import { App } from "obsidian";
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
		const files = await this.fileParser.getVaultFilesWithCustomFlag();
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
			if (this.fileParser.fileHasCustomFlag(file)) {
				processedFiles.push(await this.fileParser.parseToJson(file));
			}

			const fileId = await this.onlyEverApi.syncFiles(processedFiles);
			this.fileParser.updateFileId(file, fileId.pop());
		}
	}

	async getCountOfFilesWithCustomFlag() {
		return (await this.fileParser.getVaultFilesWithCustomFlag()).length;
	}
}

export { FileProcessor };
