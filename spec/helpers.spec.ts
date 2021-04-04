import { join } from 'path';
import { Node, Project } from 'ts-morph';
import { nodesIdentical } from '../src/helpers';

describe('helpers', () => {
    const sampleFileName = 'IEmployee.d.ts';
    let nodes: Node[];

    beforeAll(() => {
        const project = new Project({ tsConfigFilePath: join(__dirname, 'sampleTypes/tsconfig.json') });

        nodes = [];

        function addNodes(node: Node) {
            if (Node.isInterfaceDeclaration(node)) {
                nodes.push(node);
            }

            node.getChildren().forEach(addNodes);
        }

        project.getSourceFiles().forEach(addNodes);
    });

    describe('nodesIdentical', () => {
        const tests = [
            { file: 'employeeMatchZero.d.ts', expected: true },
            { file: 'employeeMatchOne.d.ts', expected: true },
            { file: 'employeeMatchTwo.d.ts', expected: true },
            { file: 'employeeMatchThree.d.ts', expected: true },
            { file: 'employeeMatchFour.d.ts', expected: true },
            { file: 'employeeDifferOne.d.ts', expected: false },
            { file: 'employeeDifferTwo.d.ts', expected: false },
            { file: 'employeeDifferThree.d.ts', expected: false },
            { file: 'employeeDifferFour.d.ts', expected: false },
        ];

        tests.forEach((test) => {
            it(`should return ${test.expected} for node specified in '${test.file}'`, () => {
                expect(nodesIdentical(getNode(sampleFileName), getNode(test.file))).toBe(test.expected);
            });
        });
    });

    function getNode(fileName: string): Node {
        const node = nodes.filter((node) => node.getSourceFile().getBaseName() === fileName)[0];

        if (node == null) {
            throw new Error(`Could not find node with filename '${fileName}'`);
        }

        return node;
    }
});
