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

        contentEl.createEl("h1", {text: `Found ${this.fileTitles.length} conflicting notes.`});
        contentEl.createEl("small", {text: `You can choose to override existing data with current notes from obsidian.`});
        contentEl.createEl('hr')

        const listContainer =  contentEl.createEl('div', {cls: 'listContainer'})

        this.fileTitles.forEach((file, index)=>{
            const listItem = listContainer.createEl('div', {cls: 'listItem'})
            listItem.createEl('span', {text: file})

            const checkbox = listItem.createEl('input', {type: 'checkbox'})
            checkbox.addEventListener("click", () =>
                this.approvedFileIndex.push(index)
            );
        })
		
        const buttonContainer = contentEl.createEl("div", {
            cls: "buttonContainer",
        });

        const cancelButton = buttonContainer.createEl("button", {
            text: 'Cancel',
            cls: "w-fit px-3",
        });

        cancelButton.addEventListener('click', ()=>{
            this.close()
        })

        const overrideButton = buttonContainer.createEl("button", {
            text: 'Override',
            cls: "w-fit px-3",
        });

        overrideButton.addEventListener('click', async () => {
            const onlyEverApi = new OnlyEverApi(this.apiToken)
            const files = this.replacementNotes
                .filter((_, index) => this.approvedFileIndex.contains(index))
                .map((note) => note)

            await onlyEverApi.syncFiles(files, true)
            this.close()
        })
    }
}
