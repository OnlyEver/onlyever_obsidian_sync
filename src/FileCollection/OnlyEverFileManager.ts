import { App, TFile } from "obsidian";
import { OnlyEverFileProcessor } from "./OnlyEverFileProcessor";
import {OnlyEverSettings} from "../interfaces";

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
}

export { OnlyEverFileManager };
