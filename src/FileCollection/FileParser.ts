import { App, TFile } from "obsidian";

interface ObsidianSourceList {
	title: string;
	content: string;
	isH1: boolean;
}

class FileParser {
	app: App;

	//This is for removing formatter from content.
	flagRegexWithId = /^---\nobsidianSync : true\nID : [\w]+\n---\n+/gm;
	flagRegexIdMatch = /^---\nobsidianSync : true\nID : (.*)\n---\n+/gm;
	flagRegex = /^---\nobsidianSync : true\n---\n+/gm;

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
	 * Returns files with custom tag in the vault.
	 *
	 * @returns TFile[]
	 */
	async getSyncableFiles() {
		const syncableFiles: TFile[] = [];
		const files = this.getVaultFiles();

		if (files) {
			for (const file of files) {
				if (this.fileHasCustomFlagOnly(file)) {
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
				if (this.fileHasBeenSynced(file)) {
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

	fileHasCustomFlagOnly(file: TFile) {
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

	fileHasBeenSynced(file: TFile) {
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

	fileHasBeenDeleted(file: TFile): boolean {
		return this.app.metadataCache.getFileCache(file)?.frontmatter?.[
			this.deleteFileFlag
		];
	}

	/*
	 * Parse to source list object format.
	 *
	 * @param file TFile
	 * @return Promise<object>
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

	async updateFileId(file: TFile, fileId: string) {
		console.log("updatingfile");
		const content = await this.app.vault.read(file);
		const replacement = `---\nobsidianSync : true\nID : ${fileId}\n---\n`;

		await this.app.vault.modify(
			file,
			content.replace(this.flagRegex, replacement)
		);
	}

	parseMarkdownHeaders(content: string) {
		const lines = content.split("\n");
		const result: ObsidianSourceList[] = [];
		let currentHeader = "";
		let currentContent = "";
		let isH1 = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const match = line.match(/^(#+)\s+(.*)$/);

			// console.log(line, match);
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

				// console.log('eta aau na bruh')
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
