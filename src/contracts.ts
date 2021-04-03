export interface ICLIOptions {
    projectPath: string;
    targetPath: string;
    retainEmptyFiles: boolean;
    barrelPath?: string;
}

export interface IDeDupeOptions extends ICLIOptions {
    logger?: typeof console;
}

export interface ITSDedupeArgs extends ICLIOptions {
    help?: boolean;
}
