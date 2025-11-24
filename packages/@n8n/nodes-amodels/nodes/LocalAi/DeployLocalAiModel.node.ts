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

export class DeployLocalAiModel implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Deploy LocalAI Model',
        name: 'deployLocalAiModel',
        group: ['transform'],
        version: 1,
        description: 'Fine-tune and deploy adapters on LocalAI runtimes',
        defaults: {
            name: 'Deploy LocalAI Model',
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
                displayName: 'Base Model',
                name: 'baseModel',
                type: 'string',
                default: 'llama3.1:8b',
                required: true,
            },
            {
                displayName: 'Dataset Path',
                name: 'datasetPath',
                type: 'string',
                default: '',
                required: true,
                description: 'Object storage path to JSONL fine-tune data',
            },
            {
                displayName: 'Deployment Channel',
                name: 'deploymentChannel',
                type: 'options',
                options: [
                    { name: 'Staging', value: 'staging' },
                    { name: 'Shadow', value: 'shadow' },
                    { name: 'Production', value: 'production' },
                ],
                default: 'staging',
            },
            {
                displayName: 'Auto Promote On Success',
                name: 'autoPromote',
                type: 'boolean',
                default: false,
            },
            {
                displayName: 'Metadata (JSON)',
                name: 'metadataJson',
                type: 'json',
                default: '{\n  \"owner\": \"ml-team\"\n}',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const credentials = (await this.getCredentials('aModelsApi')) as GatewayCredentials;

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const baseModel = this.getNodeParameter('baseModel', itemIndex) as string;
                const datasetPath = this.getNodeParameter('datasetPath', itemIndex) as string;
                const deploymentChannel = this.getNodeParameter('deploymentChannel', itemIndex) as string;
                const autoPromote = this.getNodeParameter('autoPromote', itemIndex) as boolean;
                const metadataJson = this.getNodeParameter('metadataJson', itemIndex) as string;

                let metadata: Record<string, unknown> = {};
                if (metadataJson) {
                    try {
                        metadata =
                            typeof metadataJson === 'string'
                                ? JSON.parse(metadataJson)
                                : (metadataJson as Record<string, unknown>);
                    } catch (error) {
                        throw new NodeOperationError(
                            this.getNode(),
                            `Invalid metadata JSON: ${(error as Error).message}`,
                            { itemIndex },
                        );
                    }
                }

                const payload = {
                    base_model: baseModel,
                    dataset_path: datasetPath,
                    channel: deploymentChannel,
                    auto_promote: autoPromote,
                    metadata,
                };

                const response = await axios.post(
                    `${credentials.gatewayUrl}/api/localai/deployments`,
                    payload,
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
                        baseModel,
                        datasetPath,
                        channel: deploymentChannel,
                        autoPromote,
                    },
                    pairedItem: { item: itemIndex },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: (error as Error).message,
                            operation: 'deployLocalAiModel',
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

