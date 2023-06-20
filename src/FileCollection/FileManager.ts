import { App, TFile } from "obsidian";
import { FileProcessor } from "./FileProcessor";
import { ObsidianOnlyeverPopupModal } from "../ObsidianOnlyeverPopupModal";

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
		new ObsidianOnlyeverPopupModal(this.app, this.fileProcessor).open();
	}

	onActiveFileSaveAction() {
		this.fileProcessor.processSingleFile();
	}

	// onFileDeleteAction(file: TAbstractFile) {}
	//
	// onFileModifyAction(file: TAbstractFile) {}
	//
	// onFileRenameAction(file: TAbstractFile) {}
	//
	// onFileCreateAction(file: TAbstractFile) {}
}

export { FileManager };
