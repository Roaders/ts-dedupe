import { Node } from 'ts-morph';

export function isDefined<T>(value: T | undefined | null): value is T {
    return value != null;
}

export function nodesIdentical(nodeOne: Node, nodeTwo: Node): boolean {
    return nodeOne.getText() === nodeTwo.getText();
}
