import { App, Modal, TFile } from "obsidian";
import { FileProcessor } from "./FileCollection/FileProcessor";

export class ObsidianOnlyeverPopupModal extends Modal {
	fileProcessor: FileProcessor;

	constructor(app: App, fileProcessor: FileProcessor) {
		super(app);
		this.fileProcessor = fileProcessor;
	}

	async onOpen() {
		const { contentEl } = this;
		const markButtonContainer = contentEl.createEl("div", {
			cls: "buttonContainer",
		});
		const markButton = markButtonContainer.createEl("button", {
			cls: "w-100 mt-1",
		});
		this.renderButtonContent(markButton);
		markButton.addEventListener("click", () =>
			this.fileProcessor.markActiveFileForSync()
		);

		contentEl.createEl("hr");

		const listContainer = contentEl.createEl("div", {
			cls: "",
		});

		this.renderLeftSide(
			await this.fileProcessor.fileParser.getSyncableFiles(),
			listContainer
		);
		this.renderRightSide(
			await this.fileProcessor.fileParser.getSyncedFiles(),
			listContainer
		);

		const syncButtonContainer = contentEl.createEl("div", {
			cls: "buttonContainer",
		});
		const syncButton = syncButtonContainer.createEl("button", {
			cls: "w-100 mt-1",
		});
		syncButton.setText("Sync marked files");
		syncButton.addEventListener("click", () =>
			this.fileProcessor.processFiles()
		);
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	renderLeftSide(files: TFile[], listContainer: HTMLDivElement) {
		const leftSide = listContainer.createDiv();
		leftSide
			.createEl("h1", { cls: "fs-6" })
			.setText("Files Marked for sync");
		const syncableList = leftSide.createEl("ul", { cls: "no-style-list" });

		if (files.length === 0) {
			syncableList.createEl("li", {
				text: "0 New files marked for sync.",
			});
		}

		for (const file of files) {
			syncableList.createEl("li", {
				text: file.name,
				cls: "text-warning",
			});
		}
		leftSide.createEl("hr");
	}

	renderRightSide(files: TFile[], listContainer: HTMLDivElement) {
		const rightSide = listContainer.createDiv();
		rightSide.createEl("h1", { cls: "fs-6" }).setText("Files synced");
		const syncedList = rightSide.createEl("ul", { cls: "no-style-list" });

		for (const file of files) {
			syncedList.createEl("li", { text: file.name, cls: "text-success" });
		}
	}

	renderButtonContent(button: HTMLElement) {
		const buttonContent = this.fileProcessor.activeFileHasSyncFlag()
			? "This note is already in the sync list"
			: "Add this note to sync list";
		button.setText(buttonContent);
	}
}
