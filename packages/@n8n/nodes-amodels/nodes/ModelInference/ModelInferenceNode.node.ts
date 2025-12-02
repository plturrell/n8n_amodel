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
        subtitle: '={{$parameter["modelType"]}}',
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
                displayName: 'Model Type',
                name: 'modelType',
                type: 'options',
                options: [
                    {
                        name: 'Generic (LocalAI)',
                        value: 'generic',
                        description: 'Use standard LocalAI models (e.g., Gemma, Granite, CWM)',
                    },
                    {
                        name: 'TinyRecursiveModels',
                        value: 'tinyrecursive',
                        description: 'Use TinyRecursiveModels service',
                    },
                    {
                        name: 'SentencePiece',
                        value: 'sentencepiece',
                        description: 'Use SentencePiece tokenizer service',
                    },
                    {
                        name: 'GNN Spacetime (Markitdown)',
                        value: 'gnn_spacetime',
                        description: 'Use GNN Spacetime service (formerly Markitdown)',
                    },
                    {
                        name: 'Glove (Embeddings)',
                        value: 'glove',
                        description: 'Generate text embeddings using Glove',
                    },
                ],
                default: 'generic',
                required: true,
                description: 'The type of model service to use',
            },
            // Generic / LocalAI Parameters
            {
                displayName: 'Model ID',
                name: 'modelId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        modelType: ['generic', 'glove'],
                    },
                },
                description: 'The ID of the trained model to use (e.g., gemma-2b, glove)',
            },
            {
                displayName: 'Input Message',
                name: 'inputMessage',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        modelType: ['generic'],
                    },
                },
                description: 'The user message or prompt for the model',
            },
            // Glove Parameters
            {
                displayName: 'Input Text',
                name: 'embeddingInput',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        modelType: ['glove'],
                    },
                },
                description: 'The text to generate embeddings for',
            },
            // TinyRecursive Parameters
            {
                displayName: 'Input Data (JSON)',
                name: 'inputData',
                type: 'json',
                default: '{}',
                required: true,
                displayOptions: {
                    show: {
                        modelType: ['tinyrecursive'],
                    },
                },
                description: 'The input data for inference',
            },
            {
                displayName: 'Batch Processing',
                name: 'batchProcessing',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        modelType: ['tinyrecursive'],
                    },
                },
                description: 'Whether to process multiple inputs in a batch',
            },
            // SentencePiece Parameters
            {
                displayName: 'Operation',
                name: 'spOperation',
                type: 'options',
                options: [
                    {
                        name: 'Encode',
                        value: 'encode',
                    },
                    {
                        name: 'Decode',
                        value: 'decode',
                    },
                ],
                default: 'encode',
                displayOptions: {
                    show: {
                        modelType: ['sentencepiece'],
                    },
                },
                description: 'The operation to perform',
            },
            {
                displayName: 'Text / Tokens',
                name: 'spInput',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        modelType: ['sentencepiece'],
                    },
                },
                description: 'Text to encode or JSON array of tokens to decode',
            },
            // GNN Spacetime Parameters
            {
                displayName: 'Operation',
                name: 'gnnOperation',
                type: 'options',
                options: [
                    {
                        name: 'Infer',
                        value: 'infer',
                    },
                    {
                        name: 'Process Document',
                        value: 'process',
                    },
                ],
                default: 'infer',
                displayOptions: {
                    show: {
                        modelType: ['gnn_spacetime'],
                    },
                },
            },
            {
                displayName: 'Payload (JSON)',
                name: 'gnnPayload',
                type: 'json',
                default: '{}',
                required: true,
                displayOptions: {
                    show: {
                        modelType: ['gnn_spacetime'],
                    },
                },
                description: 'The JSON payload for the GNN service',
            },
            // Common Options
            {
                displayName: 'Additional Options',
                name: 'additionalOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                displayOptions: {
                    show: {
                        modelType: ['generic'],
                    },
                },
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
                        description: 'Sampling temperature',
                    },
                    {
                        displayName: 'Max Tokens',
                        name: 'maxTokens',
                        type: 'number',
                        default: 512,
                        description: 'Maximum number of tokens to generate',
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
                const modelType = this.getNodeParameter('modelType', i) as string;
                let endpoint = '';
                let payload: any = {};

                if (modelType === 'generic') {
                    const modelId = this.getNodeParameter('modelId', i) as string;
                    const inputMessage = this.getNodeParameter('inputMessage', i) as string;
                    const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as any;

                    endpoint = `${gatewayUrl}/api/ai/chat`;
                    payload = {
                        model: modelId,
                        messages: [{ role: 'user', content: inputMessage }],
                        temperature: additionalOptions.temperature || 0.7,
                        max_tokens: additionalOptions.maxTokens || 512,
                    };
                } else if (modelType === 'glove') {
                    const modelId = this.getNodeParameter('modelId', i) as string;
                    const embeddingInput = this.getNodeParameter('embeddingInput', i) as string;

                    endpoint = `${gatewayUrl}/api/ai/embeddings`;
                    payload = {
                        model: modelId || 'glove',
                        input: embeddingInput,
                    };
                } else if (modelType === 'tinyrecursive') {
                    const inputDataStr = this.getNodeParameter('inputData', i) as string;
                    const batchProcessing = this.getNodeParameter('batchProcessing', i) as boolean;
                    const inputData = typeof inputDataStr === 'string' ? JSON.parse(inputDataStr) : inputDataStr;

                    endpoint = batchProcessing
                        ? `${gatewayUrl}/api/tinyrecursive/predict/batch`
                        : `${gatewayUrl}/api/tinyrecursive/predict`;
                    payload = inputData;
                } else if (modelType === 'sentencepiece') {
                    const operation = this.getNodeParameter('spOperation', i) as string;
                    const spInput = this.getNodeParameter('spInput', i) as string;

                    endpoint = `${gatewayUrl}/api/sentencepiece/${operation}`;
                    if (operation === 'encode') {
                        payload = { text: spInput };
                    } else {
                        // Decode expects tokens
                        let tokens;
                        try {
                            tokens = JSON.parse(spInput);
                        } catch {
                            throw new Error('For decode, input must be a JSON array of tokens');
                        }
                        payload = { tokens: tokens };
                    }
                } else if (modelType === 'gnn_spacetime') {
                    const operation = this.getNodeParameter('gnnOperation', i) as string;
                    const gnnPayloadStr = this.getNodeParameter('gnnPayload', i) as string;
                    const gnnPayload = typeof gnnPayloadStr === 'string' ? JSON.parse(gnnPayloadStr) : gnnPayloadStr;

                    if (operation === 'infer') {
                        endpoint = `${gatewayUrl}/api/gnn-spacetime/infer`;
                    } else {
                        // Assuming process endpoint based on API analysis
                        endpoint = `${gatewayUrl}/api/gnn-spacetime/process`;
                    }
                    payload = gnnPayload;
                }

                // Call API
                const response = await axios.post(endpoint, payload, {
                    headers: {
                        'X-API-Key': apiKey,
                        'Content-Type': 'application/json',
                    },
                });

                returnData.push({
                    json: response.data,
                    pairedItem: { item: i },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: (error as Error).message,
                        },
                        pairedItem: { item: i },
                    });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), (error as Error).message, { itemIndex: i });
            }
        }

        return [returnData];
    }
}
