import { App, TFile } from "obsidian";

class FileParser {
	app: App;
	flagRegex = /^---\nmyFlag: (true)\n---\n+/gm;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Returns all files of vault.
	 *
	 * @returns
	 */
	getVaultFiles() {
		return this.app.vault.getMarkdownFiles();
	}

	/**
	 * Returns file contents with custom tag.
	 *
	 * @returns
	 */
	async getRawContentsOfFile(file: TFile) {
		return await this.app.vault.read(file);
	}

	/**
	 * Check if contents has custom flag
	 *
	 * @param contents
	 *
	 * @returns
	 */
	contentHasCustomTag(contents: string): boolean {
		const match = this.flagRegex.exec(contents);

		if (match && match[1] === "true") {
			return true;
		}

		return false;
	}

	/**
	 * Returns content without custom flag
	 *
	 * @param contents
	 *
	 * @returns
	 */
	getContentsWithoutCustomTag(contents: string): string {
		return contents.replace(this.flagRegex, "");
	}
}

export { FileParser };
