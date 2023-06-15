import { App, TAbstractFile } from "obsidian";
import { FileParser } from "./FileParser";
import { OnlyEverApi } from "./../Api/onlyEverApi";

class FileProcessor {
	app: App;
	fileParser: FileParser;
	onlyEverApi: OnlyEverApi;

	constructor(app: App, apiToken: string) {
		this.app = app;
		this.fileParser = new FileParser(app);
		this.onlyEverApi = new OnlyEverApi(apiToken);
	}

	/*
	 * Do the actual functionality here.
	 */
	async processFile() {
		const files = this.fileParser.getVaultFiles();
		const vault = this.app.vault.getName();
		const processedFile = [];

		if (files) {
			for (const file of files) {
				const rawContents = await this.fileParser.getRawContentsOfFile(
					file
				);

				if (this.fileParser.contentHasCustomTag(rawContents)) {
					processedFile.push({
						title: file.name,
						slug: file.name.replace(" ", "_"),
						content:
							this.fileParser.getContentsWithoutCustomTag(
								rawContents
							),
						source_type: "obsidian",
						description: vault,
					});
					// console.log(`${file.name} has custom tag`);
					// console.log(
					// 	this.fileParser.getContentsWithoutCustomTag(rawContents)
					// );
				}
			}
		}

		// removed temporarily
		this.onlyEverApi.syncFile(processedFile);
	}

	async processSingleFile() {
		const file = this.app.workspace.getActiveFile();
		// const vault = this.app.vault.getName();
		// let processedFile = [];

		if (file) {
			const rawContents = await this.fileParser.getRawContentsOfFile(
				file
			);

			if (this.fileParser.getContentsWithoutCustomTag(rawContents)) {
				// processedFile.push({
				// 	'title': file.name,
				// 	'slug': file.name.replace(' ', '_'),
				// 	'content': this.fileParser.getContentsWithoutCustomTag(rawContents),
				// 	'source_type': 'obsidian',
				// 	'description': vault
				// });
				// console.log(`${file.name} has custom tag`);
				// console.log(
				// 	this.fileParser.getContentsWithoutCustomTag(rawContents)
				// );
			}
		}

		// already implemented but comment out later when update flow is clear else same file is pushed to database multiple times
		// this.onlyEverApi.syncFile(processedFile);
	}

	theresAFileDeleted(file: TAbstractFile) {
		// console.log("do something here", file.name);
	}
}

export { FileProcessor };
