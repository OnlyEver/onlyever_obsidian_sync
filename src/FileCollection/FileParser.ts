import { App, TFile } from "obsidian";

class FileParser {
	app: App;
	flagRegexWithId = /^---\nobsidianSync : true\nID : [\w]+\n---\n+/gm; //This is for removing formatter from content.
	flagRegexIdMatch = /^---\nobsidianSync : true\nID : (.*)\n---\n+/gm; //This is for removing formatter from content.
	flagRegex = /^---\nobsidianSync : true\n---\n+/gm; //This is for removing formatter from content.
	markForSyncFlag = "obsidianSync"; //This is for filtering.
	syncedAtleastOnceFlag = "ID"; //This is for filtering.

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
	async getSyncableFiles() {
		const syncableFiles: TFile[] = [];
		const files = this.getVaultFiles();

		if (files) {
			for (const file of files) {
				if (this.fileHasCustomFlag(file, this.markForSyncFlag)) {
					syncableFiles.push(file);
				}
			}
		}

		return syncableFiles;
	}

	async getSyncedFiles() {
		const syncedFiles: TFile[] = [];
		const files = this.getVaultFiles();

		if (files) {
			for (const file of files) {
				if (this.fileHasCustomFlag(file, this.syncedAtleastOnceFlag)) {
					syncedFiles.push(file);
				}
			}
		}

		return syncedFiles;
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
		return (await this.getRawContentsOfFile(file))
			.replace(this.flagRegex, "")
			.replace(this.flagRegexWithId, "");
	}

	async getFileId(file: TFile) {
		const flag = (await this.getRawContentsOfFile(file)).match(
			this.flagRegexIdMatch
		);
		let id = null;

		if (flag) {
			id = this.flagRegexIdMatch.exec(flag[0]);
		}

		return id ? id[1] : null;
	}

	/**
	 * Check if contents has custom flag
	 *
	 * @param file: TFile
	 * @param customFlag : string[]
	 *
	 * @returns bool
	 */
	fileHasCustomFlag(file: TFile, customFlag: string): boolean {
		// Review this @momik,
		// I was trying to make a general function that takes Tfile, N number of flags to only filter files that have those flags
		// It doesn't work when passing only Tfile, 1 flag because all synced files have obsidianSync:true flag. bruh. so badddd.

		// const hasFlag: boolean[] = [];
		// for(let i=0; i<customFlags.length; i++){
		// 	hasFlag[i] = this.app.metadataCache.getFileCache(file)?.frontmatter?.[customFlags[i]] ?? false;
		// }
		// return hasFlag.every(Boolean)

		return (
			this.app.metadataCache.getFileCache(file)?.frontmatter?.[
				customFlag
			] ?? false
		);
	}

	async parseToJson(file: TFile): Promise<object> {
		return {
			_id: await this.getFileId(file),
			title: file.basename,
			slug: file.basename.replace(" ", "-"),
			content: await this.getContentsOfFileWithoutFlag(file),
			source_type: "obsidian",
			description: "Obsidian vault",
			ctime: new Date(file.stat.ctime),
			mtime: new Date(file.stat.mtime),
		};
	}

	async updateFileId(file: TFile, fileId: string) {
		console.log("updatingfile");
		const content = await this.app.vault.read(file);
		const replacement = `---\nobsidianSync : true\nID : ${fileId}\n---\n`;

		await this.app.vault.modify(
			file,
			content.replace(this.flagRegex, replacement)
		);
	}
}

export { FileParser };
