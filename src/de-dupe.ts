import chalk from 'chalk';
import { Project, Node, InterfaceDeclaration, TypeAliasDeclaration, SourceFile } from 'ts-morph';
import { isDefined } from './helpers';
import { relative } from 'path';

type DeDupeTarget = InterfaceDeclaration | TypeAliasDeclaration;
type MatchingNodesLookup = Record<string, DeDupeTarget[] | undefined>;
type NodeLookup = Record<string, MatchingNodesLookup | undefined>;

export interface IDeDupeOptions {
    logger?: typeof console;
    retainEmptyFiles?: boolean;
}

export async function deDupe(
    projectPath: string,
    duplicatesFilePath: string,
    options: IDeDupeOptions = {},
): Promise<void> {
    options.logger?.log(chalk.blue(`Loading Project '${projectPath}'`));

    const project = new Project({ tsConfigFilePath: projectPath });

    const files = project.getSourceFiles();

    const nodeLookup: NodeLookup = buildNodeLookup(files, options);

    const nodeGroups = renameIncompatibleNodes(nodeLookup, options);

    if (Object.values(nodeGroups).length === 0) {
        options.logger?.log(chalk.green(`No duplicates found. Exiting`));
        return;
    }

    let duplicatesFile = project.getSourceFile(duplicatesFilePath);

    if (duplicatesFile == null) {
        duplicatesFile = project.createSourceFile(duplicatesFilePath);
    }

    addNodesToDuplicatesFile(Object.values(nodeGroups), duplicatesFile, options);

    const nodeList = Object.values(nodeGroups).reduce((all, current) => [...all, ...current], []);

    replaceDuplicateNodesWithImport(nodeList, duplicatesFile, options);

    tidyUpSourceFile(project.getSourceFiles(), options);

    options.logger?.log(chalk.blue(`Saving Project...`));

    await project.save();

    removeEmptyFiles(projectPath, options);

    options.logger?.log(chalk.green(`Project Saved.`));
}

/**
 * Adds duplicated nodes to the duplicates file
 * @param nodeGroups
 * @param duplicatesFile
 * @param options
 */
function addNodesToDuplicatesFile(nodeGroups: DeDupeTarget[][], duplicatesFile: SourceFile, options: IDeDupeOptions) {
    options.logger?.log(chalk.blue(`Moving duplicates to '${relative(process.cwd(), duplicatesFile.getFilePath())}'`));

    nodeGroups
        .filter(isDefined)
        .filter((group) => group.length > 0)
        .forEach((group) => {
            const node = group[0];
            const structure = node.getStructure();
            const importStructures = node
                .getSourceFile()
                .getImportDeclarations()
                .map((i) => i.getStructure());

            duplicatesFile.addStatements([structure]);
            duplicatesFile.addImportDeclarations(importStructures);
        });
}

function removeEmptyFiles(projectPath: string, options: IDeDupeOptions) {
    if (options.retainEmptyFiles === true) {
        return;
    }
    options.logger?.log(chalk.blue(`Looking for empty files...`));

    const project = new Project({ tsConfigFilePath: projectPath });

    options.logger?.log(chalk.blue(`Removing empty files...`));

    project.getSourceFiles().forEach((file) => {
        const allNodes = file.getChildren().reduce<Node[]>((all, node) => [...all, node, ...node.getChildren()], []);

        if (allNodes.length === 2 && Node.isSyntaxList(allNodes[0]) && allNodes[1].getKindName() === 'EndOfFileToken') {
            options.logger?.warn(chalk.yellow(`Deleting empty file ${relative(process.cwd(), file.getFilePath())}`));
            file.deleteImmediately();
        }
    });
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
function replaceDuplicateNodesWithImport(nodes: DeDupeTarget[], duplicatesFile: SourceFile, options: IDeDupeOptions) {
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
function renameIncompatibleNodes(nodeLookup: NodeLookup, options: IDeDupeOptions): Record<string, DeDupeTarget[]> {
    options.logger?.log(chalk.blue(`Renaming duplicated incompatible types...`));
    return Object.entries(nodeLookup)
        .filter<[string, MatchingNodesLookup]>(hasLookup)
        .reduce<Record<string, DeDupeTarget[]>>((lookup, entry) => renameNodes(lookup, entry, options), {});
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
    lookup: Record<string, DeDupeTarget[]>,
    [nodeName, nodeListLookup]: [string, MatchingNodesLookup],
    options: IDeDupeOptions,
) {
    const values = Object.values(nodeListLookup).filter(isDefined);

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

    function addToLookup(node: DeDupeTarget) {
        const name = node.getName();
        const text = node.getText();
        const matchingNodeLookup = getMatchingNodeLookup(name, nodeLookup);
        const nodesList = getNodesList(text, matchingNodeLookup);

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

function getNodesList(nodeText: string, lookup: MatchingNodesLookup): DeDupeTarget[] {
    let nodeList = lookup[nodeText];

    if (nodeList == null) {
        nodeList = [];
        lookup[nodeText] = nodeList;
    }

    return nodeList;
}

function getMatchingNodeLookup(name: string, nodeLookup: NodeLookup): MatchingNodesLookup {
    let lookup = nodeLookup[name];

    if (lookup == null) {
        lookup = {};
        nodeLookup[name] = lookup;
    }

    return lookup;
}
