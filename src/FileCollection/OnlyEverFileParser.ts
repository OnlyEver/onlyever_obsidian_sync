import {App, arrayBufferToBase64, CachedMetadata, EmbedCache, TFile, TFolder} from "obsidian";
import {OnlyEverApi} from "../Api/onlyEverApi";
import {
	MarkdownAndImageInputPayloadMap,
	MarkdownAndRemoteUrlMap,
	OeImageInputPayload,
    OnlyEverSettings,
	OeInternalLink,
	OeSection,
	Siblings,
	Stat
} from "../interfaces";
import {OeToast} from "../OeToast";

class OnlyEverFileParser {
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
	 * @param setting
	 * @param file TFile
	 * @param parent
	 * @param apiToken
	 * @param renameEvent
	 *
	 * @returns Promise<object>
	 */
	async parseFileToOeGlobalSourceJson(setting: OnlyEverSettings, file: TFile, parent: null | TFolder, apiToken: null | string): Promise<object> {
        const fileCache = this.app.metadataCache.getFileCache(file);
        const contentsWithoutFlag = await this.getContentsOfFileWithoutFlag(file);

		if (!setting.userId) {
            new OeToast('User identification failed. Please verify your token.');
            throw new Error('User identification failed. Please verify your token.');
		}

		const {content, internalLinks, bannerImageUrl} = await this.parseInternalLinks(
			setting.userId,
			contentsWithoutFlag,
			parent,
			apiToken,
			fileCache
		);

		const {listOfSection, listOfH1} = this.parseContentToOeContentJson(content);

		return {
			title: file.basename,
			banner_image: bannerImageUrl,
			slug: `${setting.userId}-${file.stat.ctime}`,
			content: JSON.stringify(listOfSection),
			description: "Obsidian vault",
			heading: listOfH1,
			internal_links: internalLinks,
			source_type: "text",
			source_category: {
				category: 'notes',
				sub_category: 'obsidian'
			},
			fileCtime: file.stat.ctime,
			fileMtime: file.stat.mtime,
			filePath: file.path,
			// @ts-ignore
			...(renameEvent ? { renamed: true } : {})
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
	parseContentToOeContentJson(markdownAsString: string): { listOfSection: OeSection[]; listOfH1: string[] } {
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
				} else {
					initialContent = initialContent + line + '\n';
				}
			} else {
				if (headingMatch) {
					// Inside the 'if condition', if the line is a heading.

					// Code looks weird but headingMatch is an array that basically contains: [ # complete title, #, title];.
					// So we're just voiding the 0 index and assigning the remaining 2 indexes to hashes and title.
					const [, hashes, title] = headingMatch;
					const heading_level = hashes.length;

					if (heading_level === 1) {
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
								heading_level: 0,
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

		if (initialContent) {
			const initialSection: OeSection = {
				title: '',
				content: initialContent,
				heading_level: 0,
				children: []
			}

			listOfSection.push(initialSection)
		}

		return {listOfSection, listOfH1};
	}

	/**
	 * Update the internal links related to wiki, YouTube and obsidian with [title|alias|index|source] format
	 *
	 * @param userId
	 * @param content
	 * @param parent
	 * @param apiToken
	 * @param fileCache
	 *
	 */
	async parseInternalLinks(userId: string, content: string, parent: null | TFolder, apiToken: null | string, fileCache: CachedMetadata | null): Promise<{
		content: string,
		internalLinks: OeInternalLink[],
		bannerImageUrl: string | null
	}> {

		const siblingObj: Siblings = {};
		const linkRegex = /\[(.*?)]\((https:\/\/(?:\w+\.wikipedia\.org\/wiki\/\S+|www\.youtube\.com\/watch\?v=\S+))\)|\[\[(.*?)]]|\b(https:\/\/(?:\w+\.wikipedia\.org\/wiki\/\S+|www\.youtube\.com\/watch\?v=\S+))\b/g;

		let match;
		let index = 0;
		let bannerImageUrl = null;
		let bannerImageKey = '';
		let embeddedImages: EmbedCache[] | undefined;

		const internalLinks: OeInternalLink[] = [];
		const linksInMdFile: string[] = [];
		const oeCustomLinks: string[] = [];
		const markdownRepresentationAndInputPayloadMap: MarkdownAndImageInputPayloadMap = {};
		const allFiles = this.app.vault.getFiles();
		const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp'];

		if (parent?.children) {
			for (const sibling of Object.values(parent?.children)) {
				siblingObj[sibling.name] = {
					'stat': (sibling as TFile).stat,
					'path': parent?.path
				}
			}
		}

		if (fileCache) {
			embeddedImages = fileCache.embeds?.filter(embed => {
				/* Returning file-embeds that end with image extension */
				return imageExtensions.some(ext => embed.link.endsWith(ext));
			});

			if (embeddedImages && embeddedImages.length > 0) {
				await Promise.all(
					embeddedImages.map(async (image, imgIndex) => {
						const markdownRepresentation = image.original;
						markdownRepresentationAndInputPayloadMap[markdownRepresentation] = await this.getImageBase64AsInputPayload(image.link, allFiles);

						if (imgIndex === 0) {
							bannerImageKey = markdownRepresentation;
						}
					})
				);
			}
		}

		if (Object.keys(markdownRepresentationAndInputPayloadMap).length > 0 && embeddedImages) {
			const markdownRepresentationWithRemoteUrlMap: MarkdownAndRemoteUrlMap = await this.getMarkdownRepresentationWithRemoteUrlMap(markdownRepresentationAndInputPayloadMap, apiToken);

			embeddedImages.forEach((embeddedImage: EmbedCache) => {
				const imageAlt = embeddedImage.displayText || '';
				const remoteUrl = markdownRepresentationWithRemoteUrlMap[embeddedImage.original];
				const newMarkdown = `![${imageAlt}](${remoteUrl})`;

				content = content.replace(embeddedImage.original, newMarkdown)
			})

			bannerImageUrl = markdownRepresentationWithRemoteUrlMap[bannerImageKey];
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

				const objectId = `${userId}-${await this.getFileCtime(filePath, siblingObj)}`;
				url = objectId;
				title = objectId;
				source = 'obsidian';
			}

			internalLinks.push({id: null, slug: title});
			linksInMdFile.push(urlWithOrWithoutAliasInMdFile);
			oeCustomLinks.push(`[[${title}|${alias}|${index}|${source}]]`);
			index = internalLinks.length;
		}

		content = this.replaceLinksInMdWithOeCustomLink(content, linksInMdFile, oeCustomLinks);

		return {content, internalLinks, bannerImageUrl};
	}

	async getImageUrl(filePath: string, siblings: { [key: string]: Stat }, apiToken: null | string) {
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

		return await this.uploadFile(fileDetails as TFile, apiToken)
	}

	async uploadFile(file: TFile, apiToken: null | string) {
		if (apiToken && apiToken.length > 0) {
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

		new OeToast('Image sync failed. No API token.')
		throw new Error('API Token is null');
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
		const files: TFile[] = this.app.vault.getFiles();

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

	async getImageBase64AsInputPayload(imagePath: string, allFiles: TFile[]): Promise<OeImageInputPayload> {
		const imageAsFile = allFiles.find((file) => file.path.includes(imagePath));

		if (imageAsFile) {
			const fileAsBinary = await this.app.vault.readBinary(imageAsFile);
			const base64 = arrayBufferToBase64(fileAsBinary);

			return {
				Body: base64,
				Key: imagePath,
				ContentEncoding: 'base64',
				ContentType: `image/${imageAsFile.extension}`,
			}
		}

		new OeToast(`Error. ${imagePath}, is not a valid file path`)

		throw new Error('Invalid image url.')
	}

	async getMarkdownRepresentationWithRemoteUrlMap(mapMarkdownRepresentationAndRemoteUrl: MarkdownAndImageInputPayloadMap, apiToken: string | null): Promise<MarkdownAndRemoteUrlMap> {
		if (apiToken) {
			const onlyEverApi = new OnlyEverApi(apiToken)

			return await onlyEverApi.syncAllImages(mapMarkdownRepresentationAndRemoteUrl);
		}

		throw new Error("Error invalid token.")
	}
}

export {OnlyEverFileParser}
