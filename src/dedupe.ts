import chalk from 'chalk';
import { Project, Node, InterfaceDeclaration, TypeAliasDeclaration, SourceFile } from 'ts-morph';
import { isDefined, nodesIdentical } from './helpers';
import { relative } from 'path';
import { IDeDupeOptions } from './contracts';

type DedupeTarget = InterfaceDeclaration | TypeAliasDeclaration;
type MatchingNodesLookup = Map<Node, DedupeTarget[]>;
type NodeLookup = Record<string, MatchingNodesLookup | undefined>;

export async function dedupe(options: IDeDupeOptions): Promise<void> {
    options.logger?.log(chalk.blue(`Loading Project '${options.project}'`));

    let project = new Project({ tsConfigFilePath: options.project });
    const files = project.getSourceFiles();
    const nodeLookup: NodeLookup = buildNodeLookup(files, options);
    const nodeGroups = renameIncompatibleNodes(nodeLookup, options);

    if (Object.values(nodeGroups).length === 0) {
        options.logger?.log(chalk.green(`No duplicates found. Exiting`));
        return;
    }

    let duplicatesFile = project.getSourceFile(options.duplicatesFile);

    if (duplicatesFile == null) {
        duplicatesFile = project.createSourceFile(options.duplicatesFile);
    }

    addNodesToDuplicatesFile(Object.values(nodeGroups), duplicatesFile, options);

    const nodeList = Object.values(nodeGroups).reduce((all, current) => [...all, ...current], []);
    replaceDuplicateNodesWithImport(nodeList, duplicatesFile, options);
    tidyUpSourceFile(project.getSourceFiles(), options);

    options.logger?.log(chalk.blue(`Saving Project...`));
    await project.save();

    project = removeEmptyFiles(options) || project;
    await createBarrel(project, options);

    options.logger?.log(chalk.green(`Project Saved.`));
}

/**
 * Creates a barrel file exporting everything from all the files in teh project
 * If no barrelFile specified in options does nothing
 * @param project
 * @param options
 * @returns
 */
async function createBarrel(project: Project, options: IDeDupeOptions) {
    if (options.barrelFile == null) {
        return;
    }

    const files = project.getSourceFiles();

    options.logger?.log(chalk.blue(`Creating Barrel: '${relative(process.cwd(), options.barrelFile)}'`));

    const barrelFile = project.createSourceFile(options.barrelFile);

    files.forEach((file) => {
        const moduleSpecifier = barrelFile.getRelativePathAsModuleSpecifierTo(file);

        barrelFile.addExportDeclaration({ moduleSpecifier });
    });

    await barrelFile.save();
}

/**
 * Adds duplicated nodes to the duplicates file
 * @param nodeGroups
 * @param duplicatesFile
 * @param options
 */
function addNodesToDuplicatesFile(nodeGroups: DedupeTarget[][], duplicatesFile: SourceFile, options: IDeDupeOptions) {
    options.logger?.log(chalk.blue(`Moving duplicates to '${relative(process.cwd(), duplicatesFile.getFilePath())}'`));

    nodeGroups
        .filter(isDefined)
        .filter((group) => group.length > 0)
        .map((group) => group[0])
        .filter((node) => node.getSourceFile().getFilePath() != duplicatesFile.getFilePath())
        .forEach((node) => {
            const structure = node.getStructure();
            const importStructures = node
                .getSourceFile()
                .getImportDeclarations()
                .map((i) => i.getStructure());

            duplicatesFile.addStatements([structure]);
            duplicatesFile.addImportDeclarations(importStructures);
        });
}

/**
 * Removes files from the project that only have an empty syntax list and an end of file marker
 * @param options
 * @returns
 */
function removeEmptyFiles(options: IDeDupeOptions) {
    if (options.retainEmptyFiles === true) {
        return undefined;
    }
    options.logger?.log(chalk.blue(`Looking for empty files...`));

    const project = new Project({ tsConfigFilePath: options.project });

    options.logger?.log(chalk.blue(`Removing empty files...`));

    project.getSourceFiles().forEach((file) => {
        const allNodes = file.getChildren().reduce<Node[]>((all, node) => [...all, node, ...node.getChildren()], []);

        if (allNodes.length === 2 && Node.isSyntaxList(allNodes[0]) && allNodes[1].getKindName() === 'EndOfFileToken') {
            options.logger?.warn(chalk.yellow(`Deleting empty file ${relative(process.cwd(), file.getFilePath())}`));
            file.deleteImmediately();
        }
    });

    return project;
}

/**
 * Removes unnecessary imports
 * @param files
 * @param options
 */
async function tidyUpSourceFile(files: SourceFile[], options: IDeDupeOptions) {
    options.logger?.log(chalk.blue(`Tidying up source files...`));
    files.forEach((file) => file.organizeImports());
}

/**
 * Deletes the original types from the source files and replaces with an import
 * @param nodes
 * @param duplicatesFilePath
 */
function replaceDuplicateNodesWithImport(nodes: DedupeTarget[], duplicatesFile: SourceFile, options: IDeDupeOptions) {
    options.logger?.log(chalk.blue(`Removing duplicates and adding imports...`));

    nodes.forEach((node) => {
        const sourceFile = node.getSourceFile();

        sourceFile.addImportDeclaration({
            moduleSpecifier: sourceFile.getRelativePathAsModuleSpecifierTo(duplicatesFile),
            namedImports: [node.getName()],
        });

        node.remove();
    });
}

/**
 * Iterates through all nodes in the lookup and groups into matched nodes with a unique name
 * @param nodeLookup
 * @param options
 * @returns
 */
function renameIncompatibleNodes(nodeLookup: NodeLookup, options: IDeDupeOptions): Record<string, DedupeTarget[]> {
    options.logger?.log(chalk.blue(`Renaming duplicated incompatible types...`));
    return Object.entries(nodeLookup)
        .filter<[string, MatchingNodesLookup]>(hasLookup)
        .reduce<Record<string, DedupeTarget[]>>((lookup, entry) => renameNodes(lookup, entry, options), {});
}

/**
 * Either adds nodes to the lookup with the original name or adds with a new name if there is a conflict between types
 * Filters out types that are not duplicated
 * @param lookup
 * @param param1
 * @param options
 * @returns
 */
function renameNodes(
    lookup: Record<string, DedupeTarget[]>,
    [nodeName, nodeListLookup]: [string, MatchingNodesLookup],
    options: IDeDupeOptions,
) {
    const values = Array.from(nodeListLookup.values()).filter(isDefined);

    if (values.length < 2 && values[0]?.length < 2) {
        return lookup;
    }
    values
        .sort((valueOne, valueTwo) => valueTwo.length - valueOne.length)
        .forEach((nodes, index) => {
            if (index === 0) {
                lookup[nodeName] = nodes;
            } else {
                const newNodeName = `${nodeName}_${index}`;
                const fileNames = nodes
                    .map((node) => node.getSourceFile().getFilePath())
                    .map((fullPath) => relative(process.cwd(), fullPath))
                    .join(', ');
                options.logger?.log(
                    chalk.yellow(`Duplicated ${nodeName} renamed to ${newNodeName} in files: [${fileNames}]`),
                );
                nodes.forEach((node) => node.rename(newNodeName));
                lookup[newNodeName] = nodes;
            }
        });

    return lookup;
}

function hasLookup(value: [string, MatchingNodesLookup | undefined]): value is [string, MatchingNodesLookup] {
    return value[1] != null;
}

function buildNodeLookup(files: SourceFile[], options: IDeDupeOptions): NodeLookup {
    options.logger?.log(chalk.blue(`Examining Project...`));

    const nodeLookup: NodeLookup = {};

    function addToLookup(node: DedupeTarget) {
        const name = node.getName();
        const matchingNodeLookup = getMatchingNodeLookup(name, nodeLookup);
        const nodesList = getNodesList(node, matchingNodeLookup);

        nodesList.push(node);
    }

    function handleNode(node: Node) {
        const isExported = node.getCombinedModifierFlags() & 0x1;
        if (!isExported) {
            return;
        }

        if (Node.isInterfaceDeclaration(node) || Node.isTypeAliasDeclaration(node)) {
            addToLookup(node);
        }

        node.forEachChild(handleNode);
    }

    files.forEach((file) => file.forEachChild(handleNode));

    return nodeLookup;
}

function getNodesList(node: Node, lookup: MatchingNodesLookup): DedupeTarget[] {
    const matchingEntry = Array.from(lookup.entries()).find(([keyNode]) => nodesIdentical(keyNode, node));

    let nodeList: DedupeTarget[];

    if (matchingEntry) {
        nodeList = matchingEntry[1];
    } else {
        nodeList = [];
        lookup.set(node, nodeList);
    }

    return nodeList;
}

function getMatchingNodeLookup(name: string, nodeLookup: NodeLookup): MatchingNodesLookup {
    let lookup = nodeLookup[name];

    if (lookup == null) {
        lookup = new Map();
        nodeLookup[name] = lookup;
    }

    return lookup;
}
