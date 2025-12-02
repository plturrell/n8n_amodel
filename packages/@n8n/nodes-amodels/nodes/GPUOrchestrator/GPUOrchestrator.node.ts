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

export class GPUOrchestrator implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'GPU Orchestrator',
        name: 'gpuOrchestrator',
        group: ['transform'],
        version: 1,
        description: 'Manage GPU jobs via the GPU Orchestrator',
        defaults: {
            name: 'GPU Orchestrator',
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
                        name: 'Submit Job',
                        value: 'submit',
                        description: 'Submit a new GPU job',
                        action: 'Submit job',
                    },
                    {
                        name: 'Get Job Status',
                        value: 'status',
                        description: 'Get the status of a job',
                        action: 'Get job status',
                    },
                    {
                        name: 'Cancel Job',
                        value: 'cancel',
                        description: 'Cancel a running job',
                        action: 'Cancel job',
                    },
                    {
                        name: 'List Jobs',
                        value: 'list',
                        description: 'List all jobs',
                        action: 'List jobs',
                    },
                    {
                        name: 'Get Job Logs',
                        value: 'logs',
                        description: 'Get logs for a job',
                        action: 'Get job logs',
                    },
                ],
                default: 'submit',
            },
            // Submit
            {
                displayName: 'Job Type',
                name: 'jobType',
                type: 'options',
                options: [
                    { name: 'Training', value: 'training' },
                    { name: 'Inference', value: 'inference' },
                    { name: 'Data Processing', value: 'processing' },
                ],
                default: 'training',
                displayOptions: {
                    show: {
                        operation: ['submit'],
                    },
                },
            },
            {
                displayName: 'Image',
                name: 'image',
                type: 'string',
                default: 'amodels/gpu-worker:latest',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['submit'],
                    },
                },
                description: 'Docker image to use',
            },
            {
                displayName: 'Command',
                name: 'command',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['submit'],
                    },
                },
                description: 'Command to execute',
            },
            {
                displayName: 'Resources (JSON)',
                name: 'resources',
                type: 'json',
                default: '{"gpu": 1, "memory": "16Gi"}',
                displayOptions: {
                    show: {
                        operation: ['submit'],
                    },
                },
                description: 'Resource requirements',
            },
            // Status / Cancel / Logs
            {
                displayName: 'Job ID',
                name: 'jobId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['status', 'cancel', 'logs'],
                    },
                },
                description: 'ID of the job',
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
                const baseUrl = `${credentials.gatewayUrl}/api/gpu`;

                if (operation === 'submit') {
                    const type = this.getNodeParameter('jobType', itemIndex) as string;
                    const image = this.getNodeParameter('image', itemIndex) as string;
                    const command = this.getNodeParameter('command', itemIndex) as string;
                    const resourcesJson = this.getNodeParameter('resources', itemIndex) as string;
                    let resources = {};
                    try {
                        resources = typeof resourcesJson === 'string' ? JSON.parse(resourcesJson) : resourcesJson;
                    } catch (e) {
                        throw new NodeOperationError(this.getNode(), 'Invalid JSON in Resources', { itemIndex });
                    }
                    response = await axios.post(`${baseUrl}/jobs`, { type, image, command, resources }, { headers });
                } else if (operation === 'status') {
                    const jobId = this.getNodeParameter('jobId', itemIndex) as string;
                    response = await axios.get(`${baseUrl}/jobs/${jobId}`, { headers });
                } else if (operation === 'cancel') {
                    const jobId = this.getNodeParameter('jobId', itemIndex) as string;
                    response = await axios.post(`${baseUrl}/jobs/${jobId}/cancel`, {}, { headers });
                } else if (operation === 'list') {
                    response = await axios.get(`${baseUrl}/jobs`, { headers });
                } else if (operation === 'logs') {
                    const jobId = this.getNodeParameter('jobId', itemIndex) as string;
                    response = await axios.get(`${baseUrl}/jobs/${jobId}/logs`, { headers });
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
                            operation: 'gpuOrchestrator',
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
