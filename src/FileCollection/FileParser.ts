import {App, TFile, TFolder, arrayBufferToBase64} from "obsidian";
import {OnlyEverApi} from "../Api/onlyEverApi";

interface OeSection {
	title: string
	content: string;
	heading_level: number;
	children: OeSection[]
}
interface OeInternalLink{
	slug: string
	id: string|null
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
	async parseToJson(file: TFile, parent: null | TFolder, apiToken: null | string): Promise<object> {
		const contentsWithoutFlag = await this.getContentsOfFileWithoutFlag(file);

		const {content, internalLinks} = await this.parseInternalLinks(
			contentsWithoutFlag,
			parent,
			apiToken
		);

		const {listOfSection, listOfH1} = this.parseMarkdownContentToOeJsonStructure(content);

		return {
			title: file.basename,
			slug: `ob-${file.stat.ctime}`,
			content: JSON.stringify(listOfSection),
			description: "Obsidian vault",
			heading: listOfH1,
			source_type: "text",
			internal_links: internalLinks,
			source_category: {
				category: 'notes',
				sub_category: 'obsidian'
			}
		};
	}

	/**
	 * Returns array of object after parsing to our format.
	 *
	 * IMPORTANT: Read code comments slow and carefully
	 *
	 * @param markdownAsString string
	 *
	 * @returns {OeSection[], string[]}
	 */
	parseMarkdownContentToOeJsonStructure(markdownAsString: string): { listOfSection: OeSection[]; listOfH1: string[] } {
		// listOfH1 is the final list of h1 ordered headings
		const listOfH1: string[] = []

		// listOfSection is the final list that we return
		const listOfSection: OeSection[] = [];

		// stack is kinda like a temporary listOfSection that maintains sections withing the hierarchy.
		const stack: OeSection[] = [];

		// Current section is just previously iterated section.
		// It is basically the active session's parent section, if the active session's heading order is smaller than active session or if the active section is just simple content.
		// This means that current section will be constantly updated to contain md contents within its hierarchy level
		let currentSection: OeSection | null = null

		let initialContent = '';
		let insideCodeBlock = false;

		const lines = markdownAsString.split('\n');

		for (const line of lines) {
			const headingMatch = line.match(/^(#+) (.+)$/);
			const codeBlockMatch = line.match(/^~~~.*$|^```.*$/);

			if (codeBlockMatch) {
				insideCodeBlock = !insideCodeBlock;
			}

			if (insideCodeBlock) {
				// This means we are iterating inside a code block
				// So we would not want to treat '# something' as a heading
				if (currentSection) {
					currentSection.content += line + '\n';
				}else{
					initialContent =  initialContent + line + '\n';
				}
			} else {
				if (headingMatch) {
					// Inside the 'if condition', if the line is a heading.

					// Code looks weird but headingMatch is an array that basically contains: [ # complete title, #, title];.
					// So we're just voiding the 0 index and assigning the remaining 2 indexes to hashes and title.
					const [, hashes, title] = headingMatch;
					const heading_level = hashes.length - 1;

					if(heading_level === 0){
						// Maintaining a list of H1s
						listOfH1.push(title);
					}

					// We need an active section for each iteration.
					const section: OeSection = {
						title,
						content: '',
						heading_level,
						children: [],
					};

					// This is for when we find heading of higher order than current section's heading order
					// We need to clear the stack until the heading order is equal to or higher
					while (stack.length > 0 && heading_level <= stack[stack.length - 1].heading_level) {
						stack.pop();
					}

					if (stack.length === 0) {
						// The stack is usually only sized 0 when there's initial paragraph(s) .i.e content before we see heading of any order
						if (initialContent !== '') {
							listOfSection.push({
								title: '',
								content: initialContent,
								heading_level: 99,
								children: [],
							});
							initialContent = '';
						}
						listOfSection.push(section);
					} else {
						// This is the normal-est flow in this whole thing.
						// We push active section to stack.
						stack[stack.length - 1].children.push(section);
					}

					stack.push(section);
					// Since the top level if condition of this block indicates that we've detected a new heading,
					// This means we are about to go to another hierarchy
					// That is why we need to update current section to active section
					// (Read this statement relatively to this iteration) :
					// So that in the next iteration, content are filled in this section rather than the previous section.
					currentSection = section;
				} else {
					// We're dealing with normal content.
					if (currentSection) {
						// We're dealing with content that falls under a heading of any order
						currentSection.content += line + '\n';
					} else if (line.trim() !== '') {
						// We're dealing with content that is does not fall under any heading.
						// Usually this is the case for when there's a paragraph before any heading in the note.
						initialContent += line + '\n';
					}
				}
			}
		}

		if(initialContent){
			const initialSection: OeSection = {
				title: '',
				content: initialContent,
				heading_level: 99,
				children: []
			}

			listOfSection.push(initialSection)
		}

		return {listOfSection, listOfH1};
	}

	/**
	 * Update the internal links related to wiki, YouTube and obsidian with [title|alias|index|source] format
	 *
	 * @param content
	 * @param parent
	 * @param apiToken
	 *
	 */
	async parseInternalLinks(content: string, parent: null | TFolder, apiToken: null | string): Promise<{
		content: string,
		internalLinks: OeInternalLink[]
	}> {
		const siblingObj: { [key: string]: Stat } = {};
		const linkRegex = /\[(.*?)\]\((https:\/\/(?:[\w]+\.wikipedia\.org\/wiki\/[^\s]+|www\.youtube\.com\/watch\?v=[^\s]+))\)|\[\[(.*?)\]\]|\b(https:\/\/(?:[\w]+\.wikipedia\.org\/wiki\/[^\s]+|www\.youtube\.com\/watch\?v=[^\s]+))\b/g;
		const internalImageLink = /\!\[\[([^|\]]+)+[|]?(.*?)\]\]/gi;

		let match;
		let index = 0;
		const internalLinks: OeInternalLink[] = [];
		const linksInMdFile: string[] = [];
		const oeCustomLinks: string[] = [];

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
			const {originalAlias, newAlias} = replacement;
			content = content.replace(originalAlias, newAlias);
		}

		while ((match = linkRegex.exec(content)) !== null) {
			let url, alias, title, source;
			const urlWithOrWithoutAliasInMdFile = match[0];

			if (urlWithOrWithoutAliasInMdFile.includes('wikipedia.org') || urlWithOrWithoutAliasInMdFile.includes('youtube.com')) {
				source = urlWithOrWithoutAliasInMdFile.includes('wikipedia.org') ? 'wikipedia' : 'youtube';
				url = match[2] || match[4] || '';
				alias = match[1] || match[3] || url;
				title = source === 'wikipedia' ? this.getTitleForWikipedia(url) : this.getTitleForYoutube(url);
			} else {
				let filePath = match[3];
				alias = filePath;

				/*
				 * In-case there exists 2 notes with same name where one of them is inside a sibling folder:
				 * (root/TestFile.md, root/SiblingFolder/TestFile.md)
				 *
				 */
				if (filePath.includes('|')) {
					const splitValues = filePath.split('|');
					filePath = splitValues[0];
					alias = splitValues[1];
				}

				const objectId = `ob-${await this.getFileCtime(filePath, siblingObj)}`;
				url = objectId;
				title = objectId;
				source = 'obsidian';
			}

			internalLinks.push( {id: null, slug: title} );
			linksInMdFile.push(urlWithOrWithoutAliasInMdFile);
			oeCustomLinks.push( `[[${title}|${alias}|${index}|${source}]]` );
			index = internalLinks.length;
		}

		content = this.replaceLinksInMdWithOeCustomLink(content, linksInMdFile, oeCustomLinks);

		return {content, internalLinks};
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
			if (apiToken) {
				const onlyEverApi = new OnlyEverApi(apiToken)
				const content = await this.app.vault.readBinary(file);
				const base64 = arrayBufferToBase64(content);
				const filePath = file.path.replace(/ /g, '+');

				const input = {
					Body: base64,
					Key: filePath,
					ContentEncoding: 'base64',
					ContentType: `image/${file.extension}`,
				}

				return await onlyEverApi.syncImages(input);
			}
		} catch (err) {
			console.log('error', err);
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
		const files: TFile[] = await this.app.vault.getFiles();

		if (Object.keys(sibling).contains(fileName)) {
			return sibling[fileName]["stat"]["ctime"];
		}

		const stat = await this.app.vault.adapter.stat(fileName);

		if (!stat && fileName) {
			for (const file of files) {
				if (file.path && file?.path === filePath || file.name === fileName) {
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


	/*
	 * Return title for wikipedia from url.
	 */
	getTitleForWikipedia(url: string): string {
		return <string>(url.split('/')).pop();
	}

	/*
	 * Return title for YouTube from url.
	 */
	getTitleForYoutube(url: string): string {
		const videoId = url.match(/v=([^&]+)/);
		return videoId ? videoId[1] : '';
	}

	/**
	 * Replaces MdFile's formatted link with custom formatted links
	 *
	 * @params string content
	 * @params string[] linksInMdFile
	 * @params string[] oeCustomLinks
	 *
	 * @returns string
	 */
	replaceLinksInMdWithOeCustomLink(content: string, linksInMdFile: string[], oeCustomLinks: string[]): string {
		const size = linksInMdFile.length;
		const fragmentedContent = [];

		for (let i = 0; i < size; i++) {
			const startIndexOfLinkInContent = content.indexOf(linksInMdFile[i]);
			const lengthOfLinkInContent = linksInMdFile[i].length;
			const endIndexOfLinkInContent = startIndexOfLinkInContent + lengthOfLinkInContent;
			const parentSubstring = content.substring(0, endIndexOfLinkInContent);

			fragmentedContent.push(parentSubstring.replace(linksInMdFile[i], oeCustomLinks[i]));
			content = content.slice(endIndexOfLinkInContent);
		}

		/**
		 * Pushing var content to fragmentedContent because:
		 * - var content has continuously been sliced and updated to contain contents after end index of each link,
		 * - meaning at the end of the loop, it contains remaining string contents without any links,
		 * - by pushing it, we ensure that var fragmentedContent actually has all the content.
		 */
		fragmentedContent.push(content);

		return fragmentedContent.join('');
	}
}

export {FileParser};
