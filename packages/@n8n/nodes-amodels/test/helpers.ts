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
        getNodeParameter<T = unknown>(parameterName: string, itemIndex?: number): T {
            const idx = itemIndex ?? 0;
            return parametersPerItem[idx][parameterName] as T;
        },
        async getCredentials<T extends object = Record<string, unknown>>(
            type?: string,
            itemIndex?: number,
        ): Promise<T> {
            return {
                gatewayUrl: 'https://gateway.local',
                apiKey: 'test-key',
            } as T;
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

