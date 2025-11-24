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

export class ValidateToomConfig implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Validate TOOM Config',
        name: 'validateToomConfig',
        group: ['transform'],
        version: 1,
        description: 'Validate and diff TOOM configuration bundles',
        defaults: {
            name: 'Validate TOOM Config',
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
                displayName: 'Config Path/URL',
                name: 'configPath',
                type: 'string',
                default: '',
                required: true,
                description: 'Git path, S3 URI, or HTTP URL to the config bundle',
            },
            {
                displayName: 'Environment',
                name: 'environment',
                type: 'options',
                options: [
                    { name: 'Staging', value: 'staging' },
                    { name: 'Production', value: 'production' },
                ],
                default: 'staging',
            },
            {
                displayName: 'Strict Validation',
                name: 'strict',
                type: 'boolean',
                default: true,
                description: 'Fail if non-breaking warnings are detected',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const credentials = (await this.getCredentials('aModelsApi')) as GatewayCredentials;

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const configPath = this.getNodeParameter('configPath', itemIndex) as string;
                const environment = this.getNodeParameter('environment', itemIndex) as string;
                const strict = this.getNodeParameter('strict', itemIndex) as boolean;

                const response = await axios.post(
                    `${credentials.gatewayUrl}/api/toom/config/validate`,
                    {
                        config_path: configPath,
                        environment,
                        strict,
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
                        configPath,
                        environment,
                    },
                    pairedItem: { item: itemIndex },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: (error as Error).message,
                            operation: 'validateToomConfig',
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

