import {App, Modal} from "obsidian";
import {OnlyEverApi} from "./Api/onlyEverApi";
import {ReplacementNote} from "./interfaces";
import {FileManager} from "./FileCollection/FileManager";


export class OverwritePopupForSingleNote extends Modal {
    private readonly apiToken: string
    private readonly manager: FileManager
    private readonly replacementNote: ReplacementNote
	constructor(app: App, manager: FileManager, apiToken: string, replacementNote: ReplacementNote) {

		super(app);
		this.manager = manager
		this.apiToken = apiToken
		this.replacementNote = replacementNote

		const {contentEl} = this;
		const messageWrapper = contentEl.createEl('h6', {cls: 'oe-error danger'});

		messageWrapper.createEl("span", {text: `A note named :`});
		messageWrapper.createEl("span", {text: ` ${this.replacementNote.title} `, cls: 'note-title-highlight'});
		messageWrapper.createEl("span", {text: `already exists in Only Ever library.`});

		contentEl.createEl("p", {text: `Would you like to replace it with this note?`, cls: 'px-2'});

		contentEl.createEl('hr');

		const spinnerOverlay = contentEl.createEl('div', {cls: 'overlay-parent hidden'});
		spinnerOverlay.createEl('div', {cls: 'loader'});

		const buttonContainer = contentEl.createEl("div", {
			cls: "buttonContainer",
		});

		const overrideButton = buttonContainer.createEl("button", {
			text: 'Overwrite',
			cls: "button w-fit px-3 p-4 primary-bg",
		});

		const cancelButton = buttonContainer.createEl("button", {
			text: 'Cancel sync',
			cls: "button w-fit px-3 p-4",
		});

		overrideButton.addEventListener('click', async () => {
			spinnerOverlay.classList.remove('hidden');

			const onlyEverApi = new OnlyEverApi(this.apiToken);
			await onlyEverApi.syncFiles([this.replacementNote], true);

			spinnerOverlay.classList.add('hidden');
			await this.buttonClose(false);
		})

		cancelButton.addEventListener('click', async () => {
			await this.buttonClose(true);
		})

		this.open()
	}

    async buttonClose(unmarkNoteOnclose: boolean) {
        if (unmarkNoteOnclose) {
            await this.manager.fileProcessor.unmarkNote(this.app, this.replacementNote.filePath);
        }

        this.close();
    }
}

