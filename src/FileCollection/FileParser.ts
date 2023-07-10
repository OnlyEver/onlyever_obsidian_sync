import { App, Notice, TFile } from "obsidian";

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

	referencesRegex = /---\s*#\s*References:(.*?)---/s;

	//This is for filtering.
	markForSyncFlag = "oe_sync";
	deleteFileFlag = "deleted";

	/**
	 * FileParser constructor
	 *
	 * @param app
	 */
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
	 * @returns TFile[]
	 */
	async getSyncableFiles(): Promise<TFile[]> {
		const syncableFiles: TFile[] = [];
		const files = this.getVaultFiles();

		if (files) {
			for (const file of files) {
				if (this.fileHasSyncFlag(file)) {
					syncableFiles.push(file);
				}
			}
		}

		return syncableFiles;
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
	async getContentsOfFileWithoutFlag(file: TFile): Promise<string> {
		const text = await this.getRawContentsOfFile(file);
		const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
		const end = frontmatter.position.end.line + 1;
		const body = text.split("\n").slice(end).join("\n");

		return body;
	}

	/**
	 * Checks if file has markForSyncFlag in it or not.
	 *
	 * @param file TFile
	 *
	 * @returns boolean
	 */
	fileHasSyncFlag(file: TFile): boolean {
		return (
			this.app.metadataCache.getFileCache(file)?.frontmatter?.[
				this.markForSyncFlag
			] === true ?? false
		);
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

		contentsWithoutFlag = this.parseInternalLinks(contentsWithoutFlag);
		const extractedReferences = this.extractReferences(contentsWithoutFlag);
		const parsedContents: string | false = this.parseCitation(
			contentsWithoutFlag,
			Object.keys(extractedReferences)
		);
		const referencesValues: never[] = Object.values(extractedReferences);

		if (!parsedContents) {
			new Notice("Failed Parsing contents");
			throw new Error("Failed Parsing contents");
		}

		return {
			title: file.basename,
			citings: JSON.stringify(this.mergeReferences(referencesValues)),
			slug: `ob-${file.stat.ctime}`,
			content: JSON.stringify(this.parseMarkdownHeaders(parsedContents)),
			source_type: "obsidian",
			description: "Obsidian vault",
			heading: this.parseHeadings(file),
			ctime: new Date(file.stat.ctime),
			mtime: new Date(file.stat.mtime),
		};
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

		if (result[0].content == "") {
			result.splice(0, 1);
		}
		return result;
	}

	/**
	 * Update the internal links related to wiki and youtube with [alias|link|] format
	 *
	 * @param content
	 *
	 * @returns string
	 */
	parseInternalLinks(content: string): string {
		const wikiMarkdownLink = new RegExp(
			/(?=\[(!\[.+?\]\(.+?\)|.+?)]\((https:\/\/([\w]+)\.wikipedia.org\/wiki\/(.*?))\))/gi
		);
		const youtubeMarkdownLink = new RegExp(
			/(?=\[(!\[.+?\]\(.+?\)|.+?)]\((https:\/\/([\w]+)\.youtube.com\/watch\?v=(.*?)&[^)]+)\))/gi
		);

		const markDownlinks = [
			...content.matchAll(wikiMarkdownLink),
			...content.matchAll(youtubeMarkdownLink),
		].map((m) => ({
			originalAlias: `[${m[1]}](${m[2]})`,
			newAlias: `[[${m[1]}|${m[2]}|${m[4]}]]`,
		}));

		for (const replacement of [...markDownlinks]) {
			const { originalAlias, newAlias } = replacement;
			content = content.replace(originalAlias, newAlias);
		}

		return content;
	}

	/**
	 * Returns headings present in a file
	 *
	 * @param file
	 *
	 * @returns Array
	 */
	parseHeadings(file: TFile) {
		const headings = this.app.metadataCache.getFileCache(file)?.headings;

		return headings?.map((item) => {
			return item["heading"];
		});
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
			const files = await this.getSyncableFiles();

			for (let i = 0; i < files.length; i++) {
				const file: TFile = files[i];

				for (let j = 0; j < linkCollection.length; j++) {
					const linkItem = linkCollection[j];
					const filePath = linkItem.link;
					const alias = this.isValidUrl(filePath)
						? filePath
						: `ob-${file.stat.ctime}`;

					fileInfoArray.push({
						id: alias,
						path: filePath,
						originalAlias: linkItem.original,
						newAlias: `[[${linkItem.link}| |${alias}]]`,
					});
				}
			}
		}

		return fileInfoArray;
	}

	/**
	 * Checks if url is valid
	 *
	 * @param path
	 *
	 * @returns bool
	 */
	isValidUrl(path: string): boolean {
		try {
			return Boolean(new URL(path));
		} catch (e) {
			return false;
		}
	}

	/*
	 * Returns key for citation entry in only-ever
	 */
	generateReferenceKey(listNumber: string): string {
		return `cite_note-${listNumber}`;
	}

	/*
	 *  Convert references to only-ever citings format
	 */
	extractReferences(noteContent: string): [] {
		const referenceJson: [] = [];
		const match = noteContent.match(this.referencesRegex);
		const allReferencesAsString: string =
			match && match[1] ? match[1].trim() : "";

		if (allReferencesAsString) {
			const referenceList = allReferencesAsString
				.split("\n")
				.filter((line) => line.trim() !== "");

			for (let i = 0; i < referenceList.length; i++) {
				const listItem = referenceList[i] ?? "";

				if (listItem) {
					const splitListItem = /^\s*([0-9]+)\.\s*(.*)$/.exec(
						listItem
					);
					if (splitListItem) {
						const listNumber = splitListItem[1];
						referenceJson[this.generateReferenceKey(listNumber)] = {
							[this.generateReferenceKey(listNumber)]:
								splitListItem[2].trim(),
						};
						console.log(referenceJson);
					} else {
						new Notice("Invalid reference format.");
						break;
					}
				}
			}
		}

		return referenceJson;
	}

	/*
	 * Changes citation format of: {{@num}} to only-ever citation format
	 */
	parseCitation(
		contentsWithoutFlag: string,
		citationKeys: string[]
	): string | false {
		for (let i = 0; i < citationKeys.length; i++) {
			if (!citationKeys[i]) {
				new Notice("Failed parsing citations.");
				return false;
			}
			const citationIndex = citationKeys[i].split("-")[1];
			const citationRegexWithIndex = new RegExp(
				`{{@${citationIndex}}}`,
				"g"
			);
			contentsWithoutFlag = contentsWithoutFlag.replace(
				citationRegexWithIndex,
				`[[${citationIndex}]](#${citationKeys[i]})`
			);
		}

		return contentsWithoutFlag;
	}

	/*
	 * Merges [{key:val},{key:val}] into {key:val, key:val}
	 */
	mergeReferences(referencesArray: never[]): { [key: string]: string } {
		return referencesArray.reduce((mergedObj, obj) => {
			const key = Object.keys(obj)[0];
			mergedObj[key] = obj[key];
			return mergedObj;
		}, {});
	}
}

export { FileParser };
