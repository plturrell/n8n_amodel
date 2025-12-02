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

export class Telemetry implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Telemetry',
        name: 'telemetry',
        group: ['transform'],
        version: 1,
        description: 'Send events, metrics, and logs to aModels Telemetry',
        defaults: {
            name: 'Telemetry',
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
                        name: 'Send Event',
                        value: 'event',
                        description: 'Track a discrete event',
                        action: 'Send event',
                    },
                    {
                        name: 'Send Metric',
                        value: 'metric',
                        description: 'Record a numerical metric',
                        action: 'Send metric',
                    },
                    {
                        name: 'Send Log',
                        value: 'log',
                        description: 'Send a log entry',
                        action: 'Send log',
                    },
                ],
                default: 'event',
            },
            // Event
            {
                displayName: 'Event Name',
                name: 'eventName',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['event'],
                    },
                },
                description: 'Name of the event (e.g., "workflow_started")',
            },
            {
                displayName: 'Properties',
                name: 'properties',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        operation: ['event'],
                    },
                },
                description: 'Additional properties for the event',
            },
            // Metric
            {
                displayName: 'Metric Name',
                name: 'metricName',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['metric'],
                    },
                },
                description: 'Name of the metric (e.g., "processing_time_ms")',
            },
            {
                displayName: 'Value',
                name: 'value',
                type: 'number',
                default: 0,
                required: true,
                displayOptions: {
                    show: {
                        operation: ['metric'],
                    },
                },
                description: 'Numerical value of the metric',
            },
            {
                displayName: 'Tags',
                name: 'tags',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        operation: ['metric'],
                    },
                },
                description: 'Tags associated with the metric',
            },
            // Log
            {
                displayName: 'Message',
                name: 'message',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['log'],
                    },
                },
                description: 'Log message',
            },
            {
                displayName: 'Level',
                name: 'level',
                type: 'options',
                options: [
                    { name: 'Info', value: 'info' },
                    { name: 'Warning', value: 'warn' },
                    { name: 'Error', value: 'error' },
                    { name: 'Debug', value: 'debug' },
                ],
                default: 'info',
                displayOptions: {
                    show: {
                        operation: ['log'],
                    },
                },
            },
            {
                displayName: 'Context',
                name: 'context',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        operation: ['log'],
                    },
                },
                description: 'Additional context for the log',
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
                const baseUrl = `${credentials.gatewayUrl}/api/telemetry`;

                if (operation === 'event') {
                    const name = this.getNodeParameter('eventName', itemIndex) as string;
                    const propsJson = this.getNodeParameter('properties', itemIndex) as string;
                    let properties = {};
                    try {
                        properties = typeof propsJson === 'string' ? JSON.parse(propsJson) : propsJson;
                    } catch (e) {
                        throw new NodeOperationError(this.getNode(), 'Invalid JSON in Properties', { itemIndex });
                    }
                    response = await axios.post(`${baseUrl}/events`, { name, properties }, { headers });
                } else if (operation === 'metric') {
                    const name = this.getNodeParameter('metricName', itemIndex) as string;
                    const value = this.getNodeParameter('value', itemIndex) as number;
                    const tagsJson = this.getNodeParameter('tags', itemIndex) as string;
                    let tags = {};
                    try {
                        tags = typeof tagsJson === 'string' ? JSON.parse(tagsJson) : tagsJson;
                    } catch (e) {
                        throw new NodeOperationError(this.getNode(), 'Invalid JSON in Tags', { itemIndex });
                    }
                    response = await axios.post(`${baseUrl}/metrics`, { name, value, tags }, { headers });
                } else if (operation === 'log') {
                    const message = this.getNodeParameter('message', itemIndex) as string;
                    const level = this.getNodeParameter('level', itemIndex) as string;
                    const contextJson = this.getNodeParameter('context', itemIndex) as string;
                    let context = {};
                    try {
                        context = typeof contextJson === 'string' ? JSON.parse(contextJson) : contextJson;
                    } catch (e) {
                        throw new NodeOperationError(this.getNode(), 'Invalid JSON in Context', { itemIndex });
                    }
                    response = await axios.post(`${baseUrl}/logs`, { message, level, context }, { headers });
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
                            operation: 'telemetry',
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
