import { parse } from 'ts-command-line-args';
import { resolve } from 'path';

interface ITSDedupeArgs {
    tsconfigPath: string;
    help?: boolean;
}

/**
 * TODO: add help documentation
 */
export const args = parse<ITSDedupeArgs>(
    {
        tsconfigPath: { type: String, defaultOption: true, defaultValue: 'tsconfig.json' },
        help: { type: Boolean, optional: true, alias: 'h' },
    },
    { helpArg: 'help' },
);

const projectPath = resolve(args.tsconfigPath);

console.log(`ts-dedupe`, projectPath);
