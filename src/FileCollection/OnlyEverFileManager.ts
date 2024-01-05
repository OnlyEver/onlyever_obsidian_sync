import {App, TAbstractFile, TFile} from "obsidian";
import { OnlyEverFileProcessor } from "./OnlyEverFileProcessor";
import {OnlyEverSettings, WasEditedMap} from "../interfaces";

class OnlyEverFileManager {
	app: App;
	ownFiles: TFile[];
	fileProcessor: OnlyEverFileProcessor;

	constructor(app: App, settings: OnlyEverSettings) {
		this.app = app;
		this.ownFiles = [];
		this.fileProcessor = new OnlyEverFileProcessor(this.app, settings);
	}

	async onActiveFileSaveAction(settings:OnlyEverSettings) {
		this.fileProcessor.processSingleFile(settings);
	}

	fileWasEdited(wasEditedMap: WasEditedMap, file: TFile|null) {
		return Boolean(file && file.path && wasEditedMap[file.path]);
	}

	isSupportedFile(file: TFile | null){
		if( file ){
			return file.extension === 'md'
		}

		return false
	}

	/*
	 * Note by @PG-Momik
	 * Single Clicking item OR drag dropping items from sidebar is considered active-leaf-change.
	 * So need to check if it's an actual active leaf change event or a false positive.
	 * So we compare the file path of the supposed new active file and the actual previous file.
	 *
	 * @return boolean
	 */
	isActualTabChanged(previousTab: TFile): boolean {
		const newActiveFile = this.app.workspace.getActiveFile();

		return previousTab?.path !== newActiveFile?.path;
	}
}

export { OnlyEverFileManager };
