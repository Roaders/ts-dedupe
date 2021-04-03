export interface ICLIOptions {
    project: string;
    duplicatesFile: string;
    retainEmptyFiles: boolean;
    barrelFile?: string;
}

export interface IDeDupeOptions extends ICLIOptions {
    logger?: typeof console;
}

export interface ITSDedupeArgs extends ICLIOptions {
    help?: boolean;
}
