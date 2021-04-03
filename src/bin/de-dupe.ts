#!/usr/bin/env node

import { parse } from 'ts-command-line-args';
import { resolve } from 'path';
import { deDupe } from '../';

interface ITSDedupeArgs {
    projectPath: string;
    targetPath: string;
    retainEmptyFiles: boolean;
    help?: boolean;
}

/**
 * TODO: add help documentation
 */
export const args = parse<ITSDedupeArgs>(
    {
        projectPath: { type: resolve, defaultOption: true, defaultValue: 'tsconfig.json' },
        targetPath: { type: resolve, alias: 't' },
        retainEmptyFiles: { type: Boolean, alias: 'r' },
        help: { type: Boolean, optional: true, alias: 'h' },
    },
    { helpArg: 'help' },
);

deDupe(args.projectPath, args.targetPath, { logger: console, retainEmptyFiles: args.retainEmptyFiles });
