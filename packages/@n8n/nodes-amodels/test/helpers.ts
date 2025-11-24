import type { IExecuteFunctions, INode } from 'n8n-workflow';

export interface NodeParameters {
    [key: string]: unknown;
}

export const createExecuteContext = (
    parametersPerItem: NodeParameters[],
): IExecuteFunctions => {
    const ctx: Partial<IExecuteFunctions> = {
        getInputData() {
            return parametersPerItem.map(() => ({ json: {} }));
        },
        getNodeParameter(parameterName: string, itemIndex: number) {
            return parametersPerItem[itemIndex][parameterName];
        },
        async getCredentials() {
            return {
                gatewayUrl: 'https://gateway.local',
                apiKey: 'test-key',
            };
        },
        continueOnFail() {
            return false;
        },
        getNode() {
            return { name: 'TestNode' } as INode;
        },
    };

    return ctx as IExecuteFunctions;
};

