import { App, TFile } from "obsidian";

interface ObsidianSourceList {
	title: string;
	content: string;
	isH1: boolean;
}

interface LinkedFileInfo {
	id: string;
	path: string;
	originalAlias: string;
	newAlias: string;
}
class FileParser {
	app: App;
	permanentToken: string;

	//This is for removing formatter from content.
	flagRegexWithId = /^---\noe_sync: true\noe_id: [\w]+\n---\n+/gm;
	flagRegexIdMatch = /^---\noe_sync: true\noe_id: (.*)\n---\n+/gm;
	flagRegex = /^---\noe_sync: true\n---\n+/gm;

	//This is for filtering.
	markForSyncFlag = "oe_sync";
	syncedAtleastOnceFlag = "oe_id";
	deleteFileFlag = "deleted";

	constructor(app: App, permanentToken: string) {
		this.app = app;
		this.permanentToken = permanentToken;
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
	 * Checks if file has oe_id in it or not.
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
		let contentsWithoutFlag = await this.getContentsOfFileWithoutFlag(file);
		const backLinkReplacements = await this.getLinkFilesDetails(file);

		for (const replacement of backLinkReplacements) {
			const { originalAlias, newAlias } = replacement;
			contentsWithoutFlag = contentsWithoutFlag.replace(
				originalAlias,
				newAlias
			);
		}

		return {
			title: file.basename,
			slug: `ob-${this.permanentToken}-${file.stat.ctime}`,
			content: JSON.stringify(
				this.parseMarkdownHeaders(contentsWithoutFlag)
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
		const replacement = `---\noe_sync: true\noe_id: ${fileId}\n---\n`;

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

	/**
	 * Returns json array of LinkedFileInfo that can be used to identify linked document
	 *
	 * @param file TFile
	 * @return LinkedFileInfo[]
	 */
	async getLinkFilesDetails(file: TFile) {
		const linkCollection = this.app.metadataCache.getFileCache(file)?.links;
		const fileInfoArray: LinkedFileInfo[] = [];

		if (linkCollection) {
			const files = await this.getSyncedFiles();

			for (let i = 0; i < files.length; i++) {
				const file: TFile = files[i];
				for (let j = 0; j < linkCollection.length; j++) {
					const linkItem = linkCollection[j];
					const filePath = linkItem.link + ".md";
					if (file.path === filePath) {
						// const fileId = await this.getFileId(file);
						const alias = `ob-${this.permanentToken}-${file.stat.ctime}`;

						fileInfoArray.push({
							id: alias,
							path: filePath,
							originalAlias: linkItem.original,
							newAlias: `[[${linkItem.link}||${alias}]]`,
						});
					}
				}
			}
		}
		return fileInfoArray;
	}
}

export { FileParser };
