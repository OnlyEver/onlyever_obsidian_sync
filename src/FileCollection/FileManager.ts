import { App, TFile } from "obsidian";
import { FileProcessor } from "./FileProcessor";

class FileManager {
	app: App;
	ownFiles: TFile[];
	fileProcessor: FileProcessor;
	apiToken: string;

	constructor(app: App, apiToken: string, imagePath:string) {
		this.app = app;
		this.ownFiles = [];
		this.fileProcessor = new FileProcessor(this.app, apiToken,imagePath);
	}

	async onActiveFileSaveAction() {
		this.fileProcessor.processSingleFile();
	}
}

export { FileManager };
