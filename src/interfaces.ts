export interface OeSection {
    title: string
    content: string;
    heading_level: number;
    children: OeSection[]
}

export interface OeInternalLink {
    slug: string
    id: string | null
}

export interface Stat {
    stat: {
        ctime: number,
        mtime: number,
        size: number,
    },
    path: string
}

export interface ApiResponse {
    success: boolean;
    message: string;
    data: ApiData;
    fileToken: string;
}

export interface OnlyEverSettings {
    apiToken: string;
    tokenValidity: boolean | null;
    syncInterval: any;
    userId: string | null;
}

export interface ReplacementNote {
    title: string;
}


export interface ApiData{
    fileSyncTime : string;
    syncCount : string;
    syncedFiles : string;
    newFiles : string;
    replacementNotes : string;
}

export interface OeResponse{
    success: boolean,
    message: string
}

export interface OeSyncResponse extends OeResponse{
    data: OeSyncResponseData
}

export interface OeSyncResponseData{
    fileSyncTime : string;
    syncCount : number;
    syncedFiles : string;
    newFiles : string;
    replacementNotes : ReplacementNote[];
}

/**
 * Represents a mapping between markdown representations and remote URLs.
 *
 * @example
 * // Example Usage:
 * const map: MarkdownAndRemoteUrlMap = {
 *   "![[image1]]": "https://example.com/image1.jpg",
 *   "![[image2]]": "https://example.com/image2.jpg",
 *   // Add more entries as needed
 * }
 */
export interface MarkdownAndRemoteUrlMap {
	[markdownImageLink: string]: string;
}

export interface OeImageInputPayload{
	Body: string
	Key: string
	ContentEncoding: string
	ContentType: string
}
export interface MarkdownAndImageInputPayloadMap{
	[markdownAlias: string] : OeImageInputPayload
}

export interface  SyncImagesResponse extends  OeResponse{
	mapMarkdownRepresentationAndRemoteUrl : MarkdownAndRemoteUrlMap
}
export interface Siblings {
    [key: string]: Stat
}
