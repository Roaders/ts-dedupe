#!/usr/bin/env node

import { resolve } from 'path';
import { parse } from 'ts-command-line-args';
import { dedupe } from '../';
import { argumentConfig, options, defaultProject } from '../constants';
import { ITSDedupeArgs } from '../contracts';

export const args = parse<ITSDedupeArgs>(argumentConfig, options);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { help, ...dedupeOptions } = {
    ...args,
    logger: console,
    project: resolve(args.project || defaultProject),
    duplicatesFile: resolve(args.duplicatesFile),
    barrelFile: args.barrelFile ? resolve(args.barrelFile) : undefined,
};

dedupe(dedupeOptions);
