import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';
import axios from 'axios';

export class ModelInferenceNode implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'aModels Inference',
        name: 'aModelsInference',
        icon: 'file:inference.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["modelId"]}}',
        description: 'Run inference on trained models',
        defaults: {
            name: 'aModels Inference',
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
                displayName: 'Model ID',
                name: 'modelId',
                type: 'string',
                default: '',
                required: true,
                description: 'The ID of the trained model to use',
            },
            {
                displayName: 'Input Data',
                name: 'inputData',
                type: 'json',
                default: '{}',
                required: true,
                description: 'The input data for inference (JSON format)',
            },
            {
                displayName: 'Batch Processing',
                name: 'batchProcessing',
                type: 'boolean',
                default: false,
                description: 'Whether to process multiple inputs in a batch',
            },
            {
                displayName: 'Additional Options',
                name: 'additionalOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Temperature',
                        name: 'temperature',
                        type: 'number',
                        typeOptions: {
                            minValue: 0,
                            maxValue: 2,
                            numberPrecision: 2,
                        },
                        default: 1.0,
                        description: 'Sampling temperature for generation models',
                    },
                    {
                        displayName: 'Max Tokens',
                        name: 'maxTokens',
                        type: 'number',
                        default: 512,
                        description: 'Maximum number of tokens to generate',
                    },
                    {
                        displayName: 'Top P',
                        name: 'topP',
                        type: 'number',
                        typeOptions: {
                            minValue: 0,
                            maxValue: 1,
                            numberPrecision: 2,
                        },
                        default: 0.9,
                        description: 'Nucleus sampling parameter',
                    },
                    {
                        displayName: 'Return Probabilities',
                        name: 'returnProbabilities',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to return prediction probabilities',
                    },
                ],
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const credentials = await this.getCredentials('aModelsApi');

        const gatewayUrl = credentials.gatewayUrl as string;
        const apiKey = credentials.apiKey as string;

        for (let i = 0; i < items.length; i++) {
            try {
                const modelId = this.getNodeParameter('modelId', i) as string;
                const inputDataStr = this.getNodeParameter('inputData', i) as string;
                const batchProcessing = this.getNodeParameter('batchProcessing', i) as boolean;
                const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
                    temperature?: number;
                    maxTokens?: number;
                    topP?: number;
                    returnProbabilities?: boolean;
                };

                // Parse input data
                let inputData;
                try {
                    inputData = typeof inputDataStr === 'string' ? JSON.parse(inputDataStr) : inputDataStr;
                } catch (error) {
                    throw new Error(`Invalid JSON in input data: ${error.message}`);
                }

                // Build request payload
                const payload: any = {
                    model_id: modelId,
                    input: inputData,
                    batch: batchProcessing,
                    ...additionalOptions,
                };

                // Call Inference API
                const response = await axios.post(
                    `${gatewayUrl}/api/models/inference`,
                    payload,
                    {
                        headers: {
                            'X-API-Key': apiKey,
                            'Content-Type': 'application/json',
                        },
                    },
                );

                const inferenceResult = response.data;

                returnData.push({
                    json: {
                        model_id: modelId,
                        input: inputData,
                        output: inferenceResult.output,
                        predictions: inferenceResult.predictions,
                        probabilities: inferenceResult.probabilities,
                        processing_time: inferenceResult.processing_time,
                        metadata: inferenceResult.metadata,
                    },
                    pairedItem: { item: i },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: error.message,
                        },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
            }
        }

        return [returnData];
    }
}
