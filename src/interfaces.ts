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

export interface ObsidianOnlyeverSettings {
    apiToken: string;
    tokenValidity: boolean | null;
    syncInterval: any;
    userId: string;
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
