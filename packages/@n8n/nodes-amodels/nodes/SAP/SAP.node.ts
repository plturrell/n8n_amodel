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

export class SAP implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'SAP Integration',
        name: 'sap',
        group: ['transform'],
        version: 1,
        description: 'Interact with SAP systems via aModels Gateway',
        defaults: {
            name: 'SAP Integration',
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
                        name: 'Execute RFC',
                        value: 'rfc',
                        description: 'Execute a Remote Function Call',
                        action: 'Execute RFC',
                    },
                    {
                        name: 'Send IDoc',
                        value: 'idoc',
                        description: 'Send an IDoc to SAP',
                        action: 'Send IDoc',
                    },
                    {
                        name: 'OData Query',
                        value: 'odata',
                        description: 'Query an OData service',
                        action: 'OData query',
                    },
                ],
                default: 'rfc',
            },
            // RFC
            {
                displayName: 'Function Name',
                name: 'functionName',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['rfc'],
                    },
                },
                description: 'Name of the RFC function (e.g., BAPI_USER_GET_DETAIL)',
            },
            {
                displayName: 'Parameters (JSON)',
                name: 'parameters',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        operation: ['rfc'],
                    },
                },
                description: 'Input parameters for the RFC',
            },
            // IDoc
            {
                displayName: 'IDoc Type',
                name: 'idocType',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['idoc'],
                    },
                },
                description: 'Type of the IDoc (e.g., ORDERS05)',
            },
            {
                displayName: 'IDoc Data (JSON)',
                name: 'idocData',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        operation: ['idoc'],
                    },
                },
                description: 'Content of the IDoc',
            },
            // OData
            {
                displayName: 'Service Name',
                name: 'serviceName',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['odata'],
                    },
                },
                description: 'Name of the OData service',
            },
            {
                displayName: 'Resource Path',
                name: 'resourcePath',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['odata'],
                    },
                },
                description: 'Path to the resource (e.g., /Products)',
            },
            {
                displayName: 'Query Options (JSON)',
                name: 'queryOptions',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        operation: ['odata'],
                    },
                },
                description: 'OData query options (e.g., $filter, $select)',
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
                const baseUrl = `${credentials.gatewayUrl}/api/sap`;

                if (operation === 'rfc') {
                    const functionName = this.getNodeParameter('functionName', itemIndex) as string;
                    const paramsJson = this.getNodeParameter('parameters', itemIndex) as string;
                    let parameters = {};
                    try {
                        parameters = typeof paramsJson === 'string' ? JSON.parse(paramsJson) : paramsJson;
                    } catch (e) {
                        throw new NodeOperationError(this.getNode(), 'Invalid JSON in Parameters', { itemIndex });
                    }
                    response = await axios.post(`${baseUrl}/rfc`, { functionName, parameters }, { headers });
                } else if (operation === 'idoc') {
                    const idocType = this.getNodeParameter('idocType', itemIndex) as string;
                    const dataJson = this.getNodeParameter('idocData', itemIndex) as string;
                    let data = {};
                    try {
                        data = typeof dataJson === 'string' ? JSON.parse(dataJson) : dataJson;
                    } catch (e) {
                        throw new NodeOperationError(this.getNode(), 'Invalid JSON in IDoc Data', { itemIndex });
                    }
                    response = await axios.post(`${baseUrl}/idoc`, { idocType, data }, { headers });
                } else if (operation === 'odata') {
                    const serviceName = this.getNodeParameter('serviceName', itemIndex) as string;
                    const resourcePath = this.getNodeParameter('resourcePath', itemIndex) as string;
                    const optionsJson = this.getNodeParameter('queryOptions', itemIndex) as string;
                    let queryOptions = {};
                    try {
                        queryOptions = typeof optionsJson === 'string' ? JSON.parse(optionsJson) : optionsJson;
                    } catch (e) {
                        throw new NodeOperationError(this.getNode(), 'Invalid JSON in Query Options', { itemIndex });
                    }
                    response = await axios.get(`${baseUrl}/odata/${serviceName}/${resourcePath}`, {
                        params: queryOptions,
                        headers
                    });
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
                            operation: 'sap',
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
