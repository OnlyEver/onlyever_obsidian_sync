import { App, Notice, TAbstractFile, TFile } from "obsidian";
import { FileProcessor } from "./FileProcessor";

class FileManager {
	app: App;
	ownFiles: TFile[];
	fileProcessor: FileProcessor;

	constructor(app: App, apiToken: string) {
		this.app = app;
		this.ownFiles = [];
		this.fileProcessor = new FileProcessor(this.app, apiToken);
	}

	async onIconClickAction() {
		new Notice("Scanning the vault");

		const count = await this.fileProcessor.getCountOfFilesWithCustomFlag();
		new Notice(`Found ${count} files with custom flag.`);

		this.fileProcessor.processFiles().then();
	}

	onActiveFileSaveAction() {
		this.fileProcessor.processSingleFile();
	}

	onFileDeleteAction(file: TAbstractFile) {}

	onFileModifyAction(file: TAbstractFile) {}

	onFileRenameAction(file: TAbstractFile) {}

	onFileCreateAction(file: TAbstractFile) {}
}

export { FileManager };
