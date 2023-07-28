import { App, Notice, TFile, TFolder, arrayBufferToBase64 } from "obsidian";
// import * as AWS  from "aws-sdk";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

const accessKey = process.env.AWS_ACCESS_KEY_ID ?? '';
const secretKey = process.env.AWS_SECRET_ACCESS_KEY ?? '';

const s3Bucket = new S3Client({
	region: process.env.S3_REGION,
	credentials: {
		accessKeyId: accessKey,
		secretAccessKey: secretKey
	}
});

class FileParser {
	app: App;
	imagePath: string;

	//This is for filtering.
	markForSyncFlag = "oe_sync";
	deleteFileFlag = "deleted";

	/**
	 * FileParser constructor
	 *
	 * @param app
	 */
	constructor(app: App, imagePath:string) {
		this.app = app;
		this.imagePath = imagePath;
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
	 * Checks if file has markForSyncFlag in it or not.
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
	 *
	 * @returns Promise<object>
	 */
	async parseToJson(file: TFile, parent: null | TFolder, apiToken: null | string): Promise<object> {
		let contentsWithoutFlag = await this.getContentsOfFileWithoutFlag(file);

		contentsWithoutFlag = await this.parseInternalLinks(
			contentsWithoutFlag,
			parent,
			apiToken
		);

		return {
			title: file.basename,
			slug: `ob-${file.stat.ctime}`,
			content: JSON.stringify(
				this.parseMarkdownHeaders(contentsWithoutFlag)
			),
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
	async parseInternalLinks(content: string, parent: null | TFolder, apiToken: null | string): Promise<string> {
		const siblingObj: { [key: string]: Stat } = {};
		const wikiMarkdownLink = new RegExp(
			/(?=\[(!\[.+?\]\(.+?\)|.+?)]\((https:\/\/([\w]+)\.wikipedia.org\/wiki\/(.*?))\))/gi
		);
		const youtubeMarkdownLink = new RegExp(
			/(?=\[(!\[.+?\]\(.+?\)|.+?)]\((https:\/\/([\w]+)\.youtube.com\/watch\?v=(.*?)&[^)]+)\))/gi
		);

		const wikiLink =
			/(?<!\()https:\/\/([\w]+)\.wikipedia.org\/wiki\/([^\s]+)/gi;
		const youtubeLink =
			/(?<!\()https:\/\/([\w]+)\.youtube.com\/watch\?v=([^\s]+)&[^\s)]+/gi;

		const internalLink = /(?<!!)\[\[([^|\]]+)+[|]?(.*?)\]\]/gi;
		const internalImageLink = /\!\[\[([^|\]]+)+[|]?(.*?)\]\]/gi;


		if (parent?.children) {
			for (const sibling of Object.values(parent?.children)) {
				siblingObj[sibling.name] = {
					'stat': (sibling as TFile).stat,
					'path': parent?.path
				}
			}
		}


		if (parent?.children) {
			for (const sibling of Object.values(parent?.children)) {
				siblingObj[sibling.name] = {
					stat: (sibling as TFile).stat,
					path: parent?.path,
				};
			}
		}

		const internalMarkDownLink = await Promise.all(
			[...content.matchAll(internalLink)].map(async (m) => ({
				originalAlias: m[2] ? `[[${m[1]}|${m[2]}]]` : `[[${m[1]}]]`,
				newAlias: m[2]
					? `[[${m[2]}| |ob-${await this.getFileCtime(m[1], siblingObj)}]]`
					: `[[${m[1]}| |ob-${await this.getFileCtime(m[1], siblingObj)}]]`,
			}))
		);

		const internalImageMarkDownLink = await Promise.all(
			[...content.matchAll(internalImageLink)].map(async (m) => ({
				originalAlias: `![[${m[1]}]]`, internalImageLink,
				newAlias: `![${m[1]}](${await this.getFileUrl(m[1], siblingObj, apiToken)})`
			}))
		);

		const markDownlinks = [
			...content.matchAll(wikiMarkdownLink),
			...content.matchAll(youtubeMarkdownLink),
		].map((m) => ({
			originalAlias: `[${m[1]}](${m[2]})`,
			newAlias: `[[${m[1]}|${m[2]}|${m[4]}]]`,
		}));


		content = content.replace(wikiLink, "[[$&|$&|$2]]");
		content = content.replace(youtubeLink, "[[$&|$&|$2]]");

		for (const replacement of [...internalMarkDownLink, ...markDownlinks, ...internalImageMarkDownLink]) {
			const { originalAlias, newAlias } = replacement;
			content = content.replace(originalAlias, newAlias);
		}

		return content;
	}

	async getFileUrl(filePath: string, siblings: { [key: string]: Stat }, apiToken: null | string) {
		console.log('getFileUrl');
		if(this.imagePath===''){
			return '';
		}

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
		console.log('upload file')
		try {
			if(apiToken){
				const onlyEverApi =  new OnlyEverApi(apiToken)
				const content = await this.app.vault.readBinary(file);
				const base64 = arrayBufferToBase64(content);
				const base64Data = Buffer.from(base64.replace(/^data:image\/\w+;base64,/, ""), 'base64');
				const filePath = (`${this.imagePath}/${file.path}`).replace(/ /g,'+');

				const input = {
					Body: base64,
					Key: filePath,
					ContentEncoding: 'base64',
					ContentType: `image/${file.extension}`,
				}
				return await onlyEverApi.syncImages(input);
			}

			// const command = new PutObjectCommand(input);
			//
			// await s3Bucket.send(command, function (err, data) {
			// 	if (err) {
			// 		console.log(err);
			// 		new Notice('Error occurred while uploading data:'+data);
			// 	}
			// });
			//
			// const encodeFileName = encodeURIComponent(`${filePath}`);
			//
			// console.log('upload', process.env.S3_BUCKET);
			// return `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${encodeFileName}`;
		} catch (err) {
			console.log('error',err);
		}
	}

	/***
	 * Returns ctime of file based on file path
	 *
	 *
	 * @return Promis<string>
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
