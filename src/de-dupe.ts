import chalk from 'chalk';
import { Project, Node, InterfaceDeclaration, TypeAliasDeclaration, SourceFile } from 'ts-morph';
import { isDefined } from './helpers';
import { join, normalize, relative } from 'path';

type DeDupeTarget = InterfaceDeclaration | TypeAliasDeclaration;
type MatchingNodesLookup = Record<string, DeDupeTarget[] | undefined>;
type NodeLookup = Record<string, MatchingNodesLookup | undefined>;

export interface IDeDupeOptions {
    logger?: typeof console;
}

export async function deDupe(
    projectPath: string,
    duplicatesFilePath: string,
    options: IDeDupeOptions = {},
): Promise<void> {
    options.logger?.log(chalk.blue(`Loading Project '${projectPath}'`));

    const project = new Project({ tsConfigFilePath: projectPath });
    // const typeChecker = project.getTypeChecker();

    const files = project.getSourceFiles();

    const nodeLookup: NodeLookup = buildNodeLookup(files, options);

    const nodeGroups = renameIncompatibleNodes(nodeLookup, options);

    if (Object.values(nodeGroups).length === 0) {
        options.logger?.log(chalk.green(`No duplicates found. Exiting`));
        return;
    }

    const duplicatesFile = project.createSourceFile(duplicatesFilePath); // TODO try to add existing first if it fails create new

    const nodeList = Object.values(nodeGroups).reduce((all, current) => [...all, ...current], []);

    replaceDuplicateNodesWithImport(nodeList, duplicatesFile);

    options.logger?.log(chalk.blue(`Saving Project...`));

    await project.save();

    options.logger?.log(chalk.green(`Project Saved.`));
}

/**
 * Deletes the original types from the source files and replaces with an import
 * @param nodes
 * @param duplicatesFilePath
 */
function replaceDuplicateNodesWithImport(nodes: DeDupeTarget[], duplicatesFile: SourceFile) {
    nodes.forEach((node) => {
        const sourceFile = node.getSourceFile();

        let relativePath: string;

        if (sourceFile.getDirectoryPath() === duplicatesFile.getDirectoryPath()) {
            relativePath = `./${duplicatesFile.getBaseNameWithoutExtension()}`;
        } else {
            console.log(
                `relative`,
                sourceFile.getFilePath(),
                duplicatesFile.getFilePath(),
                relative(sourceFile.getFilePath(), duplicatesFile.getFilePath()),
            );
            relativePath = relative(sourceFile.getFilePath(), duplicatesFile.getFilePath()); // TODO resolve issues with generating relative path
        }

        sourceFile.addImportDeclaration({
            moduleSpecifier: relativePath,
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
