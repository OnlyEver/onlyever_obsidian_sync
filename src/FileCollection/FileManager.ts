import { App, TAbstractFile, TFile } from "obsidian";
import { FileProcessor } from "./FileProcessor";

class FileManager {
	app: App;
	files: TFile[];
	ownFiles: TFile[];
	fileProcessor: FileProcessor;

	constructor(app: App) {
		this.app = app;
		this.ownFiles = [];
		this.fileProcessor = new FileProcessor(this.app);
	}

	onFileSaveAction() {
		console.log("onFileSaveAction");
		this.fileProcessor.processFile();
	}

	onFileDeleteAction(file: TAbstractFile) {
		console.log("onFileDeleteAction", file.name);
		this.fileProcessor.theresAFileDeleted(file);
	}

	onFileModifyAction(file: TAbstractFile) {
		console.log("onFileModifiedAction", file.name);
	}

	onFileRenameAction(file: TAbstractFile) {
		console.log("onFileRenamed", file.name);
		console.log(file);
	}

	onFileCreateAction(file: TAbstractFile) {
		console.log("File created", file.name);
	}
}

export { FileManager };
