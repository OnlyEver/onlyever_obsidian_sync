import { App, TAbstractFile } from "obsidian";
import { FileParser } from "./FileParser";

class FileProcessor {
	fileParser: FileParser;

	constructor(app: App) {
		this.fileParser = new FileParser(app);
	}

	/*
	 * Do do the actual functionality here.
	 */
	async processFile() {
		const files = this.fileParser.getVaultFiles();

		for (const file of files) {
			const rawContents = await this.fileParser.getRawContentsOfFile(
				file
			);

			if (this.fileParser.contentHasCustomTag(rawContents)) {
				console.log(`${file.name} has custom tag`);
				console.log("Contents:");
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
