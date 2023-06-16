import { App, TFile } from "obsidian";

class FileParser {
	app: App;
	flagRegex = /^---\nobsidianSync : true\n---\n+/gm; //This is for removing formatter from content.
	customFlag = "obsidianSync"; //This is for filtering.

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Returns all files of vault.
	 *
	 * @returns TFile[]
	 */
	getVaultFiles() {
		return this.app.vault.getMarkdownFiles();
	}

	/**
	 * Returns files with custom tag in the vault.
	 *
	 * @returns TFile[]
	 */
	async getVaultFilesWithCustomFlag() {
		const filesWithCustomFlag: TFile[] = [];
		const files = this.getVaultFiles();

		if (files) {
			for (const file of files) {
				if (this.fileHasCustomFlag(file)) {
					filesWithCustomFlag.push(file);
				}
			}
		}

		return filesWithCustomFlag;
	}

	/**
	 * Returns file contents with custom tag.
	 *
	 * @returns string
	 */
	async getRawContentsOfFile(file: TFile) {
		return await this.app.vault.read(file);
	}

	/**
	 * Returns content without custom flag
	 *
	 * @returns string
	 */
	async getContentsOfFileWithoutFlag(file: TFile) {
		return (await this.getRawContentsOfFile(file)).replace(
			this.flagRegex,
			""
		);
	}

	/**
	 * Check if contents has custom flag
	 *
	 * @param file: TFile
	 *
	 * @returns bool
	 */
	fileHasCustomFlag(file: TFile): boolean {
		return (
			this.app.metadataCache.getFileCache(file)?.frontmatter?.[
				this.customFlag
			] ?? false
		);
	}

	async parseToJson(file: TFile): Promise<object> {
		return {
			title: file.basename,
			slug: file.basename.replace(" ", "-"),
			content: await this.getContentsOfFileWithoutFlag(file),
			source_type: "obsidian",
			description: file.name,
		};
	}
}

export { FileParser };
