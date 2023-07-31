import { App, TFile } from "obsidian";
import { FileProcessor } from "./FileProcessor";

class FileManager {
	app: App;
	ownFiles: TFile[];
	fileProcessor: FileProcessor;
	apiToken: string;

	constructor(app: App, apiToken: string) {
		this.app = app;
		this.ownFiles = [];
		this.fileProcessor = new FileProcessor(this.app, apiToken);
	}

	async onActiveFileSaveAction() {
		this.fileProcessor.processSingleFile();
	}
}

export { FileManager };
