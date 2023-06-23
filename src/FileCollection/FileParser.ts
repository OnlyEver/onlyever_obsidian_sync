import { App, TFile } from "obsidian";

interface ObsidianSourceList {
	title: string;
	content: string;
	isH1: boolean;
}

class FileParser {
	app: App;

	//This is for removing formatter from content.
	flagRegexWithId = /^---\nobsidianSync: true\nID: [\w]+\n---\n+/gm;
	flagRegexIdMatch = /^---\nobsidianSync: true\nID: (.*)\n---\n+/gm;
	flagRegex = /^---\nobsidianSync: true\n---\n+/gm;

	//This is for filtering.
	markForSyncFlag = "obsidianSync";
	syncedAtleastOnceFlag = "ID";
	deleteFileFlag = "deleted";

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
	 * Returns files with markForSyncFlag in the vault.
	 *
	 * @param strict boolean
	 *
	 * @returns TFile[]
	 */
	async getSyncableFiles(strict = true): Promise<TFile[]> {
		const syncableFiles: TFile[] = [];
		const files = this.getVaultFiles();

		if (files) {
			for (const file of files) {
				if (strict && this.fileHasSyncFlagOnly(file)) {
					syncableFiles.push(file);
				}

				if (!strict && this.fileHasSyncFlag(file)) {
					syncableFiles.push(file);
				}
			}
		}

		return syncableFiles;
	}

	/**
	 * Returns files with syncedAtleastOnceFlag in the vault.
	 *
	 * @returns TFile[]
	 */
	async getSyncedFiles() {
		const syncedFiles: TFile[] = [];
		const files = this.getVaultFiles();

		if (files) {
			for (const file of files) {
				if (this.fileHasIdFlag(file)) {
					syncedFiles.push(file);
				}
			}
		}

		return syncedFiles;
	}

	/**
	 * Returns all contents of file
	 *
	 * @param file TFile
	 *
	 * @returns string
	 */
	async getRawContentsOfFile(file: TFile) {
		return await this.app.vault.read(file);
	}

	/**
	 * Returns content after removing all flags
	 *
	 * @param file TFile
	 *
	 * @returns string
	 */
	async getContentsOfFileWithoutFlag(file: TFile) {
		const rawContents = await this.getRawContentsOfFile(file);

		if (rawContents.match(this.flagRegex)) {
			return rawContents.replace(this.flagRegex, "");
		}

		if (rawContents.match(this.flagRegexIdMatch)) {
			return rawContents.replace(this.flagRegexWithId, "");
		}

		return rawContents;
	}

	/**
	 * Returns file id
	 * @param file TFile
	 *
	 * @returns string
	 */
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
	 * Checks if file has markForSyncFlag in it or not.
	 * @param file TFile
	 *
	 * @returns boolean
	 */
	fileHasSyncFlag(file: TFile): boolean {
		return (
			this.app.metadataCache.getFileCache(file)?.frontmatter?.[
				this.markForSyncFlag
			] ?? false
		);
	}

	/**
	 * Checks if file has ONLY markForSyncFlag in it or not.
	 *
	 * @param file TFile
	 *
	 * @returns boolean
	 */
	fileHasSyncFlagOnly(file: TFile) {
		if (
			this.app.metadataCache.getFileCache(file)?.frontmatter?.[
				this.markForSyncFlag
			]
		) {
			if (
				!this.app.metadataCache.getFileCache(file)?.frontmatter?.[
					this.syncedAtleastOnceFlag
				]
			) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Checks if file has ID in it or not.
	 *
	 * @param file TFile
	 *
	 * @returns boolean
	 */
	fileHasIdFlag(file: TFile) {
		if (
			this.app.metadataCache.getFileCache(file)?.frontmatter?.[
				this.markForSyncFlag
			]
		) {
			if (
				this.app.metadataCache.getFileCache(file)?.frontmatter?.[
					this.syncedAtleastOnceFlag
				]
			) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Checks if file has deleted in it or not.
	 *
	 * @param file TFile
	 *
	 * @returns boolean
	 */
	fileHasDeleteFlag(file: TFile): boolean {
		return this.app.metadataCache.getFileCache(file)?.frontmatter?.[
			this.deleteFileFlag
		];
	}

	/**
	 * Parse to source list object format.
	 *
	 * @param file TFile
	 *
	 * @returns Promise<object>
	 */
	async parseToJson(file: TFile): Promise<object> {
		return {
			_id: await this.getFileId(file),
			title: file.basename,
			slug: file.basename.replace(" ", "-"),
			content: JSON.stringify(
				this.parseMarkdownHeaders(
					await this.getContentsOfFileWithoutFlag(file)
				)
			),
			source_type: "obsidian",
			description: "Obsidian vault",
			ctime: new Date(file.stat.ctime),
			mtime: new Date(file.stat.mtime),
		};
	}

	/**
	 * Updates/Adds file id to synced file
	 *
	 * @param file TFile
	 * @param fileId string
	 *
	 * @returns Promise<object>
	 */
	async updateFileId(file: TFile, fileId: string) {
		const content = await this.app.vault.read(file);
		const replacement = `---\nobsidianSync: true\nID: ${fileId}\n---\n`;

		await this.app.vault.modify(
			file,
			content.replace(this.flagRegex, replacement)
		);
	}

	/**
	 * Returns array of object after parsing to our format.
	 *
	 * @param content string
	 *
	 * @returns Promise<object>
	 */
	parseMarkdownHeaders(content: string) {
		const lines = content.split("\n");
		const result: ObsidianSourceList[] = [];
		let currentHeader = "";
		let currentContent = "";
		let isH1 = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const match = line.match(/^(#+)\s+(.*)$/);

			if (match) {
				const headerLevel = match[1].length ?? 0;
				const headerContent = match[2];
				if (currentHeader !== null) {
					result.push({
						title: currentHeader?.trim(),
						content: currentContent.trim(),
						isH1: isH1,
					});
				}

				currentHeader = headerContent;
				currentContent = "";
				isH1 = headerLevel === 1;
			} else {
				currentContent += line + "\n";
			}
		}

		if (currentHeader !== null) {
			result.push({
				title: currentHeader?.trim(),
				content: currentContent.trim(),
				isH1: isH1,
			});
		}

		return result;
	}
}

export { FileParser };
