import { LanguageVariant, Node, ScriptTarget, SyntaxKind } from 'ts-morph';
import { createScanner } from 'typescript';

export function isDefined<T>(value: T | undefined | null): value is T {
    return value != null;
}

export function nodesIdentical(nodeOne: Node, nodeTwo: Node): boolean {
    return nodeOne.getText() === nodeTwo.getText();
}

export function areSame(valueOne: string, valueTwo: string): boolean {
    const tokens1 = getTokens(valueOne);
    const tokens2 = getTokens(valueTwo);

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const token1 = tokens1.next();
        const token2 = tokens2.next();

        console.log({ token1, token2 });

        if (token1.done && token2.done) return true;
        if (token1.done || token2.done) return false;
        if (token1.value !== token2.value) return false;
    }
}

function* getTokens(value: string) {
    const scanner = createScanner(ScriptTarget.Latest, true);
    scanner.setText(value);
    scanner.setOnError((message) => console.error(message));
    scanner.setLanguageVariant(LanguageVariant.Standard);

    while (scanner.scan() !== SyntaxKind.EndOfFileToken) yield scanner.getTokenText();
}
