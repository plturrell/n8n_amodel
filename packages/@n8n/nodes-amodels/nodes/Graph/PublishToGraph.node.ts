import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';
import axios from 'axios';

interface GatewayCredentials {
    gatewayUrl: string;
    apiKey: string;
}

export class PublishToGraph implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Publish To Graph',
        name: 'publishToGraph',
        group: ['transform'],
        version: 1,
        description: 'Validate and load extraction batches into the graph knowledge base',
        defaults: {
            name: 'Publish To Graph',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'aModelsApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Validation Mode',
                name: 'validationMode',
                type: 'options',
                default: 'checksum',
                options: [
                    { name: 'Checksum', value: 'checksum' },
                    { name: 'Counts', value: 'counts' },
                    { name: 'None', value: 'none' },
                ],
            },
            {
                displayName: 'Payload JSON',
                name: 'payloadJson',
                type: 'json',
                default: '{\n  "batchId": "batch-123",\n  "nodes": [],\n  "relationships": []\n}',
                required: true,
                description: 'Extraction payload produced by the extract service',
            },
            {
                displayName: 'Target Namespace',
                name: 'namespace',
                type: 'string',
                default: 'knowledge-base',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const credentials = (await this.getCredentials('aModelsApi')) as GatewayCredentials;

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const validationMode = this.getNodeParameter('validationMode', itemIndex) as string;
                const namespace = this.getNodeParameter('namespace', itemIndex) as string;
                const payloadJson = this.getNodeParameter('payloadJson', itemIndex) as string;

                let payload: Record<string, unknown>;
                try {
                    payload =
                        typeof payloadJson === 'string'
                            ? JSON.parse(payloadJson)
                            : (payloadJson as Record<string, unknown>);
                } catch (error) {
                    throw new NodeOperationError(
                        this.getNode(),
                        `Invalid payload JSON: ${(error as Error).message}`,
                        { itemIndex },
                    );
                }

                const response = await axios.post(
                    `${credentials.gatewayUrl}/api/graph/publish`,
                    {
                        namespace,
                        validation_mode: validationMode,
                        payload,
                    },
                    {
                        headers: {
                            'X-API-Key': credentials.apiKey,
                            'Content-Type': 'application/json',
                        },
                    },
                );

                returnData.push({
                    json: {
                        ...response.data,
                        namespace,
                        validationMode,
                    },
                    pairedItem: { item: itemIndex },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: (error as Error).message,
                            operation: 'publishToGraph',
                        },
                        pairedItem: { item: itemIndex },
                    });
                    continue;
                }

                throw error;
            }
        }

        return [returnData];
    }
}

