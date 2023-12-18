import {App, Modal} from "obsidian";
import {OnlyEverApi} from "./Api/onlyEverApi";
import {ReplacementNote} from "./interfaces";


export class OverrideConfirmationPopup extends Modal {

    apiToken: string
    fileTitles: string[]
    approvedFileIndex : number[]
    replacementNotes: ReplacementNote[]

    constructor(app: App, replacementNotes: ReplacementNote[], apiToken: string) {
        super(app);

        this.apiToken = apiToken;
        this.fileTitles = [];
        this.approvedFileIndex = [];
        this.replacementNotes = replacementNotes;

        replacementNotes.map((note: ReplacementNote)=>{
            this.fileTitles.push(note.title)
        })
    }

    async onOpen() {
        const {contentEl} = this;


        contentEl.createEl("h1", {text: `${this.fileTitles.length} conflicting note(s).`});
        contentEl.createEl("div", {text: `Notes with same title discovered. You can choose to overwrite existing note with current notes from obsidian.`, cls: 'oaerror danger'});

        contentEl.createEl('hr')

        const spinnerOverlay = contentEl.createEl('div', {cls: 'overlay-parent hidden'})
        spinnerOverlay.createEl('div', {cls: 'loader'})

        const listContainer =  contentEl.createEl('div', {cls: 'listContainer'})

        this.fileTitles.forEach((file, index)=>{
            const listItem = listContainer.createEl('div', {cls: 'listItem'})
            listItem.createEl('span', {text: `Note: ${file}`})

            const checkbox = listItem.createEl('input', {type: 'checkbox'})
            checkbox.addEventListener("click", () =>
                this.approvedFileIndex.push(index)
            );
        })

        const buttonContainer = contentEl.createEl("div", {
            cls: "buttonContainer",
        });


        const overrideButton = buttonContainer.createEl("button", {
            text: 'Overwrite',
            cls: "w-fit px-3 primary-bg",
        });

        overrideButton.addEventListener('click', async () => {
            spinnerOverlay.classList.remove('hidden')
            const onlyEverApi = new OnlyEverApi(this.apiToken)
            const files = this.replacementNotes
                .filter((_, index) => this.approvedFileIndex.contains(index))
                .map((note) => note)

            await onlyEverApi.syncFiles(files, true)
            spinnerOverlay.classList.add('hidden')
            this.close()
        })
    }
}
