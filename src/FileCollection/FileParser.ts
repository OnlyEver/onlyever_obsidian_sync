import { App, TFile, TFolder, arrayBufferToBase64 } from "obsidian";
import {OnlyEverApi} from "../Api/onlyEverApi";

interface ObsidianSourceList {
	title: string;
	content: string;
	isH1: boolean;
}

interface Stat {
	stat: {
		ctime: number,
		mtime: number,
		size: number,
	},
	// extension: string,
	path: string
}

class FileParser {
	app: App;

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
				if (await this.fileHasSyncFlag(file)) {
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
		const YAMLFrontMatter = /^---\s*[\s\S]*?\s*---/g;
		const body = text.replace(YAMLFrontMatter, "");

		return body;
	}

	/**
	 * Checks if file has oe_sync property in it or not.
	 *
	 * @param file TFile
	 *
	 * @returns boolean
	 */
	async fileHasSyncFlag(file: TFile): Promise<boolean> {
		let syncValue = false;

		await this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			syncValue = frontmatter["oe_sync"];
		});

		return syncValue;
	}

	/**
	 * Parse to source list object format.
	 *
	 * @param file TFile
	 * @param parent
	 * @param apiToken
	 *
	 * @returns Promise<object>
	 */
	async parseToJson(file: TFile, parent: null | TFolder, apiToken:null|string): Promise<object> {
		const contentsWithoutFlag = await this.getContentsOfFileWithoutFlag(file);

		const [parsedContent, allLinks] = await this.parseInternalLinks(
			contentsWithoutFlag,
			parent,
			apiToken
		);

		const {result, headings} = this.parseMarkdownHeaders(parsedContent)

		return {
			title: file.basename,
			slug: `ob-${file.stat.ctime}`,
			content: JSON.stringify(result),
			source_type: "obsidian",
			description: "Obsidian vault",
			heading: headings,
			ctime: new Date(file.stat.ctime),
			mtime: new Date(file.stat.mtime),
			user_list: [],
			outgoing_links: allLinks
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
		const headings:string[]  = []
		let currentHeader = "";
		let currentContent = "";
		let isH1 = false;
		let insideCodeTag = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			const matchHeader = line.match(/^(#+)\s+(.*)$/);
			const matchStartBlock = line.match(/^~~~.*$|^```.*$/);

			if(matchStartBlock){
				insideCodeTag=!insideCodeTag;
			}

			if(!insideCodeTag && matchHeader){
				const headerLevel = matchHeader[1].length;
				const headerContent = matchHeader[2];

				if (currentHeader !== "" || currentHeader !== null) {
					result.push({
						title: currentHeader.trim(),
						content: currentContent.trim(),
						isH1: isH1,
					});
				}

				currentHeader = headerContent;
				currentContent = "";
				isH1 = headerLevel === 1

				if(isH1){
					headings.push(currentHeader.trim());
				}
			}else{
				currentContent += line + "\n";
			}
		}

		if (currentHeader !== "" || currentHeader !== null) {
			result.push({
				title: currentHeader?.trim(),
				content: currentContent.trim(),
				isH1: isH1,
			});
		}

		if (result[0] && result[0].content == "") {
			result.splice(0, 1);
		}

		return {result, headings};
	}

	/**
	 * Update the internal links related to wiki, YouTube and obsidian with [title|alias|index|source] format
	 *
	 * @param content
	 * @param parent
	 * @param apiToken
	 *
	 * @returns [string, string[]]
	 */
	async parseInternalLinks(content: string, parent: null | TFolder , apiToken: null | string): Promise<[string, string[]]> {
		const siblingObj: { [key: string]: Stat } = {};

		const allLinks = [];
		const linkRegex = /\[(.*?)\]\((https:\/\/(?:[\w]+\.wikipedia\.org\/wiki\/[^\s]+|www\.youtube\.com\/watch\?v=[^\s]+))\)|\[\[(.*?)\]\]|\b(https:\/\/(?:[\w]+\.wikipedia\.org\/wiki\/[^\s]+|www\.youtube\.com\/watch\?v=[^\s]+))\b/g;
		const internalImageLink = /\!\[\[([^|\]]+)+[|]?(.*?)\]\]/gi;

		let match;
		let index = 0;

		if (parent?.children) {
			for (const sibling of Object.values(parent?.children)) {
				siblingObj[sibling.name] = {
					'stat': (sibling as TFile).stat,
					'path': parent?.path
				}
			}
		}

		const internalImageMarkDownLink = await Promise.all(
			[...content.matchAll(internalImageLink)].map(async (m) => ({
				originalAlias: `![[${m[1]}]]`, internalImageLink,
				newAlias: `![${m[1]}](${await this.getFileUrl(m[1], siblingObj, apiToken)})`
			}))
		);

		for (const replacement of [...internalImageMarkDownLink]) {
			const { originalAlias, newAlias } = replacement;
			content = content.replace(originalAlias, newAlias);
		}

		while ((match = linkRegex.exec(content)) !== null) {
			const url = match[2] || match[4] || '';
			let alias = match[1] || match[3] || url;

			let source = '';
			let title = '';
			let customLink ='';

			index = allLinks.length;

			if (url) {
				if (url.includes('wikipedia.org')) {
					source = 'wikipedia';
					title = (url.split('/')).pop()??'';
				} else if (url.includes('youtube.com')) {
					source = 'youtube';
					const videoId = url.match(/v=([^&]+)/);
					title = videoId ? videoId[1] : '';
				}

				allLinks.push(url);
				customLink = `[[${title}|${alias}|${index}|${source}]]`;
			} else {
				source = 'obsidian';
				let filePath = match[3];
				alias = filePath;

				if (filePath.includes('|')) {
					const splitValues =  filePath.split('|');
					filePath = splitValues[0];
					alias = splitValues[1];
				}

				const objectId = `ob-${await this.getFileCtime(filePath, siblingObj)}`;

				allLinks.push(objectId)
				title = objectId
			}

			customLink = `[[${title}|${alias}|${index}|${source}]]`;
			content = content.replace(match[0], customLink);
		}

		return [content, allLinks];
	}

	async getFileUrl(filePath: string, siblings: { [key: string]: Stat }, apiToken: null | string) {
		const files = this.app.vault.getFiles();
		let fileDetails = {};

		if (Object.keys(siblings).contains(filePath)) {
			const siblingPath = siblings[filePath].path;
			filePath = siblingPath === '/' ? filePath : `${siblingPath}/${filePath}`;

		}

		for (const file of files) {
			if (file.path && file?.path === filePath) {
				fileDetails = file;
				break;
			}

		}

		return await this.uploadFile(fileDetails as TFile, apiToken);
	}

	async uploadFile(file: TFile, apiToken: null | string) {
		try {
			if(apiToken){
				const onlyEverApi =  new OnlyEverApi(apiToken)
				const content = await this.app.vault.readBinary(file);
				const base64 = arrayBufferToBase64(content);
				const filePath = file.path.replace(/ /g,'+');

				const input = {
					Body: base64,
					Key: filePath,
					ContentEncoding: 'base64',
					ContentType: `image/${file.extension}`,
				}

				return await onlyEverApi.syncImages(input);
			}
		} catch (err) {
			console.log('error',err);
		}
	}

	/***
	 * Returns ctime of file based on file path
	 *
	 * @return Promise<string>
	 *
	 * @param filePath
	 * @param sibling
	 */
	async getFileCtime(filePath: string, sibling: { [key: string]: Stat }) {
		const fileName = `${filePath}.md`;
		const files:TFile[] = await this.app.vault.getFiles();

		if (Object.keys(sibling).contains(fileName)) {
			return sibling[fileName]["stat"]["ctime"];
		}

		const stat = await this.app.vault.adapter.stat(fileName);

		if(!stat && fileName){
			for (const file of files) {
				if (file.path && file?.path === filePath || file.name===fileName) {
					return file?.stat.ctime;
				}
			}
		}


		return stat?.ctime;
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
}

export { FileParser };
