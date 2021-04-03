#!/usr/bin/env node

import { parse } from 'ts-command-line-args';
import { resolve } from 'path';
import { deDupe } from '../';
import { ITSDedupeArgs } from '../contracts';

/**
 * TODO: add help documentation
 */
export const args = parse<ITSDedupeArgs>(
    {
        projectPath: { type: resolve, defaultOption: true, defaultValue: 'tsconfig.json' },
        targetPath: { type: resolve, alias: 't' },
        retainEmptyFiles: { type: Boolean, alias: 'r' },
        barrelPath: { type: resolve, optional: true, alias: 'b' },
        help: { type: Boolean, optional: true, alias: 'h' },
    },
    { helpArg: 'help' },
);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { help, ...dedupeOptions } = args;

deDupe({ ...dedupeOptions, logger: console });
