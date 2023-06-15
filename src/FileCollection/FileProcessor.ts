import { App, TAbstractFile } from "obsidian";
import { FileParser } from "./FileParser";

class FileProcessor {
	app: App;
	fileParser: FileParser;

	constructor(app: App) {
		this.app = app;
		this.fileParser = new FileParser(app);
	}

	/*
	 * Do the actual functionality here.
	 */
	async processFile() {
		const files = this.fileParser.getVaultFiles();

		if (files) {
			for (const file of files) {
				const rawContents = await this.fileParser.getRawContentsOfFile(
					file
				);

				if (this.fileParser.contentHasCustomTag(rawContents)) {
					console.log(`${file.name} has custom tag`);
					console.log(
						this.fileParser.getContentsWithoutCustomTag(rawContents)
					);
				}
			}
		}
	}

	async processSingleFile() {
		const file = this.app.workspace.getActiveFile();

		if (file) {
			const rawContents = await this.fileParser.getRawContentsOfFile(
				file
			);

			if (this.fileParser.getContentsWithoutCustomTag(rawContents)) {
				console.log(`${file.name} has custom tag`);
				console.log(
					this.fileParser.getContentsWithoutCustomTag(rawContents)
				);
			}
		}
	}

	theresAFileDeleted(file: TAbstractFile) {
		console.log("do something here", file.name);
	}
}

export { FileProcessor };
