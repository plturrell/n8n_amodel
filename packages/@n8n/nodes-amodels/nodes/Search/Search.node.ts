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

export class Search implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Search Service',
        name: 'search',
        group: ['transform'],
        version: 1,
        description: 'Interact with the aModels Search Service',
        defaults: {
            name: 'Search',
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
                        name: 'Search',
                        value: 'search',
                        description: 'Execute a search query',
                        action: 'Search',
                    },
                    {
                        name: 'Index Document',
                        value: 'index',
                        description: 'Index a document',
                        action: 'Index document',
                    },
                    {
                        name: 'Delete Document',
                        value: 'delete',
                        description: 'Delete a document from the index',
                        action: 'Delete document',
                    },
                    {
                        name: 'Reindex',
                        value: 'reindex',
                        description: 'Trigger a reindex operation',
                        action: 'Reindex',
                    },
                    {
                        name: 'Get Stats',
                        value: 'stats',
                        description: 'Get search index statistics',
                        action: 'Get stats',
                    },
                ],
                default: 'search',
            },
            // Search
            {
                displayName: 'Query',
                name: 'query',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['search'],
                    },
                },
                description: 'The search query',
            },
            {
                displayName: 'Limit',
                name: 'limit',
                type: 'number',
                default: 10,
                displayOptions: {
                    show: {
                        operation: ['search'],
                    },
                },
                description: 'Max number of results',
            },
            // Index
            {
                displayName: 'Document ID',
                name: 'docId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['index', 'delete'],
                    },
                },
                description: 'Unique identifier for the document',
            },
            {
                displayName: 'Content',
                name: 'content',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['index'],
                    },
                },
                description: 'Text content of the document',
            },
            {
                displayName: 'Metadata (JSON)',
                name: 'metadata',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        operation: ['index'],
                    },
                },
                description: 'Additional metadata for the document',
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
                const headers = {
                    'X-API-Key': credentials.apiKey,
                    'Content-Type': 'application/json',
                };
                const baseUrl = `${credentials.gatewayUrl}/api/search`;

                if (operation === 'search') {
                    const query = this.getNodeParameter('query', itemIndex) as string;
                    const limit = this.getNodeParameter('limit', itemIndex) as number;
                    response = await axios.get(`${baseUrl}/query`, {
                        params: { q: query, limit },
                        headers
                    });
                } else if (operation === 'index') {
                    const id = this.getNodeParameter('docId', itemIndex) as string;
                    const content = this.getNodeParameter('content', itemIndex) as string;
                    const metadataJson = this.getNodeParameter('metadata', itemIndex) as string;
                    let metadata = {};
                    try {
                        metadata = typeof metadataJson === 'string' ? JSON.parse(metadataJson) : metadataJson;
                    } catch (e) {
                        throw new NodeOperationError(this.getNode(), 'Invalid JSON in Metadata', { itemIndex });
                    }
                    response = await axios.post(`${baseUrl}/index`, { id, content, metadata }, { headers });
                } else if (operation === 'delete') {
                    const id = this.getNodeParameter('docId', itemIndex) as string;
                    response = await axios.delete(`${baseUrl}/index/${id}`, { headers });
                } else if (operation === 'reindex') {
                    response = await axios.post(`${baseUrl}/reindex`, {}, { headers });
                } else if (operation === 'stats') {
                    response = await axios.get(`${baseUrl}/stats`, { headers });
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
                            operation: 'search',
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
