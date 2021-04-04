import { LanguageVariant, Node, ScriptTarget, SyntaxKind } from 'ts-morph';
import { createScanner, Scanner } from 'typescript';

export function isDefined<T>(value: T | undefined | null): value is T {
    return value != null;
}

export function nodesIdentical(nodeOne: Node, nodeTwo: Node): boolean {
    return generatorsMatch(createNodeScanner(nodeOne), createNodeScanner(nodeTwo));
}

function generatorsMatch(scannerOne: Scanner, scannerTwo: Scanner): boolean {
    const generatorOne = getTokens(scannerOne);
    const generatorTwo = getTokens(scannerTwo);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const token1 = generatorOne.next();
        const token2 = generatorTwo.next();

        if (token1.done && token2.done) return true;
        if (token1.done || token2.done) return false;
        if (token1.value !== token2.value) return false;
    }
}

function createNodeScanner(node: Node): Scanner {
    const scanner = createScanner(ScriptTarget.Latest, true);
    scanner.setText(node.getText());
    scanner.setOnError((message) => console.error(message));
    scanner.setLanguageVariant(LanguageVariant.Standard);

    return scanner;
}

function* getTokens(scanner: Scanner) {
    while (scanner.scan() !== SyntaxKind.EndOfFileToken) yield scanner.getTokenText();
}
