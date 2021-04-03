import { ArgumentConfig, ParseOptions, UsageGuideConfig } from 'ts-command-line-args';
import { ITSDedupeArgs } from './contracts';

export const argumentConfig: ArgumentConfig<ITSDedupeArgs> = {
    project: {
        type: String,
        defaultValue: 'tsconfig.json',
        alias: 'p',
        description: `Location of the tsconfig file for your project. Defaults to 'tsconfig.json'`,
    },
    duplicatesFile: {
        type: String,
        alias: 'd',
        defaultOption: true,
        description: `Path of the file where duplicate types will be moved to.`,
    },
    retainEmptyFiles: {
        type: Boolean,
        alias: 'r',
        description: `If specified empty files will not be removed (may cause issues if also generating a barrel file)`,
    },
    barrelFile: {
        type: String,
        optional: true,
        alias: 'b',
        description: `Optional. If specified will generate a barrel file for all the files in your project.`,
    },
    help: { type: Boolean, optional: true, alias: 'h', description: `Displays the help guide.` },
};

export const options: ParseOptions<ITSDedupeArgs> = {
    helpArg: 'help',
    headerContentSections: [
        {
            header: 'Ts-Dedupe',
            content: ['A cli tool to move duplicated types and interfaces to a single file.'],
        },
        {
            header: 'Features',
            headerLevel: 2,
            includeIn: 'markdown',
            content: [
                '* Moves duplicate interfaces and types to a single file',
                '* Renames types / interfaces with the same name but different structure',
                '* Organises imports in files',
                '* Deletes empty files',
                '* Creates a barrel file exporting all types in project',
            ],
        },
    ],
};

export const usageGuideInfo: UsageGuideConfig<ITSDedupeArgs> = {
    arguments: argumentConfig,
    parseOptions: options,
};
