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

export class RegulatoryCompliance implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Regulatory Compliance',
        name: 'regulatoryCompliance',
        group: ['transform'],
        version: 1,
        description: 'Ensure compliance with regulatory standards',
        defaults: {
            name: 'Regulatory Compliance',
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
                        name: 'Check Compliance',
                        value: 'check',
                        description: 'Check against a specific regulation',
                        action: 'Check compliance',
                    },
                    {
                        name: 'Scan for PII',
                        value: 'scanPii',
                        description: 'Scan text for PII',
                        action: 'Scan for PII',
                    },
                    {
                        name: 'Log Audit Event',
                        value: 'audit',
                        description: 'Log a compliance audit event',
                        action: 'Log audit event',
                    },
                ],
                default: 'check',
            },
            // Check
            {
                displayName: 'Regulation',
                name: 'regulation',
                type: 'options',
                options: [
                    { name: 'GDPR', value: 'gdpr' },
                    { name: 'HIPAA', value: 'hipaa' },
                    { name: 'CCPA', value: 'ccpa' },
                    { name: 'Internal Policy', value: 'internal' },
                ],
                default: 'gdpr',
                displayOptions: {
                    show: {
                        operation: ['check'],
                    },
                },
            },
            {
                displayName: 'Data Context (JSON)',
                name: 'context',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        operation: ['check'],
                    },
                },
                description: 'Context data for the compliance check',
            },
            // Scan PII
            {
                displayName: 'Text',
                name: 'text',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['scanPii'],
                    },
                },
                description: 'Text to scan',
            },
            // Audit
            {
                displayName: 'Event Type',
                name: 'eventType',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['audit'],
                    },
                },
                description: 'Type of the audit event',
            },
            {
                displayName: 'Details (JSON)',
                name: 'details',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        operation: ['audit'],
                    },
                },
                description: 'Event details',
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
                const baseUrl = `${credentials.gatewayUrl}/api/compliance`;

                if (operation === 'check') {
                    const regulation = this.getNodeParameter('regulation', itemIndex) as string;
                    const contextJson = this.getNodeParameter('context', itemIndex) as string;
                    let context = {};
                    try {
                        context = typeof contextJson === 'string' ? JSON.parse(contextJson) : contextJson;
                    } catch (e) {
                        throw new NodeOperationError(this.getNode(), 'Invalid JSON in Context', { itemIndex });
                    }
                    response = await axios.post(`${baseUrl}/check`, { regulation, context }, { headers });
                } else if (operation === 'scanPii') {
                    const text = this.getNodeParameter('text', itemIndex) as string;
                    response = await axios.post(`${baseUrl}/scan-pii`, { text }, { headers });
                } else if (operation === 'audit') {
                    const eventType = this.getNodeParameter('eventType', itemIndex) as string;
                    const detailsJson = this.getNodeParameter('details', itemIndex) as string;
                    let details = {};
                    try {
                        details = typeof detailsJson === 'string' ? JSON.parse(detailsJson) : detailsJson;
                    } catch (e) {
                        throw new NodeOperationError(this.getNode(), 'Invalid JSON in Details', { itemIndex });
                    }
                    response = await axios.post(`${baseUrl}/audit`, { eventType, details }, { headers });
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
                            operation: 'regulatoryCompliance',
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
