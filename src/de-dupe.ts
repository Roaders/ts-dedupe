import { Project, Node, InterfaceDeclaration, TypeAliasDeclaration } from 'ts-morph';

type DeDupeTarget = InterfaceDeclaration | TypeAliasDeclaration;
type MatchingNodesLookup = Record<string, DeDupeTarget[] | undefined>;
type NodeLookup = Record<string, MatchingNodesLookup | undefined>;

export function deDupe(projectPath: string, duplicatesFilePath: string): void {
    console.log(`deDupe`, projectPath, duplicatesFilePath);

    const project = new Project({ tsConfigFilePath: projectPath });
    // const typeChecker = project.getTypeChecker();

    const files = project.getSourceFiles();

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

    files.forEach((file) => {
        console.log(`file`, file.getFilePath());

        file.forEachChild(handleNode);

        //file.fixUnusedIdentifiers(); TODO
    });
}

function getNodesList(nodeText: string, lookup: MatchingNodesLookup): DeDupeTarget[] {
    let nodeList = lookup[nodeText];

    if (nodeList == null) {
        console.log(`creating node list for ${nodeText}`);
        nodeList = [];
        lookup[nodeText] = nodeList;
    } else {
        console.log(`returning existing node list for ${nodeText}`);
    }

    return nodeList;
}

function getMatchingNodeLookup(name: string, nodeLookup: NodeLookup): MatchingNodesLookup {
    let lookup = nodeLookup[name];

    if (lookup == null) {
        console.log(`creating Node lookup for ${name}`);
        lookup = {};
        nodeLookup[name] = lookup;
    } else {
        console.log(`Returning existing lookup for ${name}`);
    }

    return lookup;
}
