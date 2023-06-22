import { App, TAbstractFile, TFile } from "obsidian";
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

	async onActiveFileSaveAction() {
		this.fileProcessor.processSingleFile().then();
	}

	onFileModifyAction(file: TAbstractFile) {
		console.log(file.name);
	}

	onFileRenameAction(file: TAbstractFile) {
		console.log(file.name);
	}
}

export { FileManager };
