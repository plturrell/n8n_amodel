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

export class Catalog implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Model Catalog',
        name: 'catalog',
        group: ['transform'],
        version: 1,
        description: 'Interact with the aModels Model Catalog',
        defaults: {
            name: 'Model Catalog',
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
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'List Models',
                        value: 'list',
                        description: 'List all registered models',
                        action: 'List models',
                    },
                    {
                        name: 'Get Model',
                        value: 'get',
                        description: 'Get details of a specific model',
                        action: 'Get model',
                    },
                    {
                        name: 'Register Model',
                        value: 'register',
                        description: 'Register a new model in the catalog',
                        action: 'Register model',
                    },
                    {
                        name: 'Update Model',
                        value: 'update',
                        description: 'Update an existing model',
                        action: 'Update model',
                    },
                    {
                        name: 'Delete Model',
                        value: 'delete',
                        description: 'Delete a model from the catalog',
                        action: 'Delete model',
                    },
                ],
                default: 'list',
            },
            // Get / Delete / Update
            {
                displayName: 'Model ID',
                name: 'modelId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['get', 'delete', 'update'],
                    },
                },
                description: 'The unique identifier of the model',
            },
            // Register / Update
            {
                displayName: 'Model Name',
                name: 'modelName',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['register'],
                    },
                },
                description: 'Human-readable name of the model',
            },
            {
                displayName: 'Model Type',
                name: 'modelType',
                type: 'options',
                options: [
                    { name: 'LLM', value: 'llm' },
                    { name: 'Embedding', value: 'embedding' },
                    { name: 'Vision', value: 'vision' },
                    { name: 'Audio', value: 'audio' },
                    { name: 'Other', value: 'other' },
                ],
                default: 'llm',
                displayOptions: {
                    show: {
                        operation: ['register'],
                    },
                },
            },
            {
                displayName: 'Metadata (JSON)',
                name: 'metadataJson',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        operation: ['register', 'update'],
                    },
                },
                description: 'Additional metadata for the model',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const credentials = (await this.getCredentials('aModelsApi')) as GatewayCredentials;
        const operation = this.getNodeParameter('operation', 0) as string;

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                let response;
                const baseUrl = `${credentials.gatewayUrl}/api/catalog/models`;
                const headers = {
                    'X-API-Key': credentials.apiKey,
                    'Content-Type': 'application/json',
                };

                if (operation === 'list') {
                    response = await axios.get(baseUrl, { headers });
                } else if (operation === 'get') {
                    const modelId = this.getNodeParameter('modelId', itemIndex) as string;
                    response = await axios.get(`${baseUrl}/${modelId}`, { headers });
                } else if (operation === 'delete') {
                    const modelId = this.getNodeParameter('modelId', itemIndex) as string;
                    response = await axios.delete(`${baseUrl}/${modelId}`, { headers });
                } else if (operation === 'register') {
                    const name = this.getNodeParameter('modelName', itemIndex) as string;
                    const type = this.getNodeParameter('modelType', itemIndex) as string;
                    const metadataJson = this.getNodeParameter('metadataJson', itemIndex) as string;

                    let metadata = {};
                    if (metadataJson) {
                        try {
                            metadata = typeof metadataJson === 'string' ? JSON.parse(metadataJson) : metadataJson;
                        } catch (e) {
                            throw new NodeOperationError(this.getNode(), 'Invalid JSON in Metadata', { itemIndex });
                        }
                    }

                    const payload = { name, type, metadata };
                    response = await axios.post(baseUrl, payload, { headers });
                } else if (operation === 'update') {
                    const modelId = this.getNodeParameter('modelId', itemIndex) as string;
                    const metadataJson = this.getNodeParameter('metadataJson', itemIndex) as string;

                    let metadata = {};
                    if (metadataJson) {
                        try {
                            metadata = typeof metadataJson === 'string' ? JSON.parse(metadataJson) : metadataJson;
                        } catch (e) {
                            throw new NodeOperationError(this.getNode(), 'Invalid JSON in Metadata', { itemIndex });
                        }
                    }

                    const payload = { metadata };
                    response = await axios.patch(`${baseUrl}/${modelId}`, payload, { headers });
                }

                returnData.push({
                    json: response?.data || { success: true },
                    pairedItem: { item: itemIndex },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: (error as Error).message,
                            operation: 'catalog',
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
