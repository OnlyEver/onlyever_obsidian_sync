import {App, Modal} from "obsidian";
import {ObsidianOnlyeverSettings, ReplacementNote} from "./interfaces";
import {OeToast} from "./OeToast";
import {FileManager} from "./FileCollection/FileManager";


export class OverwritePopupForMultipleNotes extends Modal {
	replacementNotes: ReplacementNote[]
	manager: FileManager
	settings: ObsidianOnlyeverSettings
	apiToken:string
	constructor(app: App, manager: FileManager, settings: ObsidianOnlyeverSettings,  replacementNotes: ReplacementNote[]) {
		super(app);
		this.replacementNotes = replacementNotes;
		this.manager = manager;
		this.apiToken = settings.apiToken;
		this.settings = settings;

		const {contentEl} = this;
		const messageWrapper = contentEl.createEl('h6', {cls: 'oe-error danger'});

		messageWrapper.createEl("span", {text: `Notes with these titles already exist in Only Ever.`});

		contentEl.createEl("p", {text: `Sync or replace these notes individually. Click to open note.`, cls: 'px-2'});
		contentEl.createEl('hr');

		const spinnerOverlay = contentEl.createEl('div', {cls: 'overlay-parent hidden'});
		spinnerOverlay.createEl('div', {cls: 'loader'});

		const listContainer = contentEl.createEl('div', {cls: 'list-container'});
		
		for (const replacementNote of this.replacementNotes) {
			this.manager.fileProcessor.unmarkNote(this.app, replacementNote.filePath)
				.then(() => { new OeToast(`${replacementNote.title} unmarked for Only Ever sync.`) });

			const listItem = listContainer.createEl('div', {cls: 'list-item  fromLeft'})
			listItem.createEl('span', {text: replacementNote.title})
			listItem.createEl('span', {text: `path : ${replacementNote.filePath}`, cls: 'list-item-path'})

			listItem.addEventListener('click', () => {
				this.manager.fileProcessor.openNoteInObsidian(this.app, replacementNote.filePath).then(()=>this.close())
			})
		}

		const buttonContainer = contentEl.createEl("div", {
			cls: "buttonContainer",
		});

		const syncRemainingButton = buttonContainer.createEl("button", {
			text: `Sync remaining notes`,
			cls: "button w-fit px-3 p-4 primary-bg",
		});

		syncRemainingButton.addEventListener('click', async () => {
			this.manager.fileProcessor.processFiles(this.settings).then()
			this.close()
		})

		const cancelButton = buttonContainer.createEl("button", {
			text: 'Continue',
			cls: "button w-fit px-3 p-4",
		});

		cancelButton.addEventListener('click', () => {
			this.close()
		})

		this.open()
	}
}

