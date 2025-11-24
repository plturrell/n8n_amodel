import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';
import axios from 'axios';

export class OCRNode implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'aModels OCR',
        name: 'aModelsOCR',
        icon: 'file:ocr.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Extract text from images using DeepSeek OCR',
        defaults: {
            name: 'aModels OCR',
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
                        name: 'Extract Text',
                        value: 'extractText',
                        description: 'Extract text from an image',
                        action: 'Extract text from an image',
                    },
                    {
                        name: 'Extract with Bounding Boxes',
                        value: 'extractWithBoxes',
                        description: 'Extract text with bounding box coordinates',
                        action: 'Extract text with bounding boxes',
                    },
                ],
                default: 'extractText',
            },
            {
                displayName: 'Input Type',
                name: 'inputType',
                type: 'options',
                options: [
                    {
                        name: 'Binary Data',
                        value: 'binary',
                        description: 'Image from binary data',
                    },
                    {
                        name: 'URL',
                        value: 'url',
                        description: 'Image from URL',
                    },
                    {
                        name: 'Base64',
                        value: 'base64',
                        description: 'Base64 encoded image',
                    },
                ],
                default: 'binary',
                description: 'The type of input to process',
            },
            {
                displayName: 'Binary Property',
                name: 'binaryPropertyName',
                type: 'string',
                default: 'data',
                required: true,
                displayOptions: {
                    show: {
                        inputType: ['binary'],
                    },
                },
                description: 'Name of the binary property containing the image',
            },
            {
                displayName: 'Image URL',
                name: 'imageUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        inputType: ['url'],
                    },
                },
                description: 'URL of the image to process',
            },
            {
                displayName: 'Base64 Image',
                name: 'base64Image',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        inputType: ['base64'],
                    },
                },
                description: 'Base64 encoded image data',
            },
            {
                displayName: 'Language',
                name: 'language',
                type: 'options',
                options: [
                    {
                        name: 'Auto Detect',
                        value: 'auto',
                    },
                    {
                        name: 'English',
                        value: 'en',
                    },
                    {
                        name: 'Arabic',
                        value: 'ar',
                    },
                    {
                        name: 'Chinese',
                        value: 'zh',
                    },
                ],
                default: 'auto',
                description: 'Language of the text in the image',
            },
            {
                displayName: 'Confidence Threshold',
                name: 'confidenceThreshold',
                type: 'number',
                typeOptions: {
                    minValue: 0,
                    maxValue: 1,
                    numberPrecision: 2,
                },
                default: 0.5,
                description: 'Minimum confidence score for text detection (0-1)',
            },
            {
                displayName: 'Additional Options',
                name: 'additionalOptions',
                type: 'collection',
                placeholder: 'Add Option',
                default: {},
                options: [
                    {
                        displayName: 'Detect Orientation',
                        name: 'detectOrientation',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to detect and correct image orientation',
                    },
                    {
                        displayName: 'Remove Noise',
                        name: 'removeNoise',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to apply noise reduction preprocessing',
                    },
                    {
                        displayName: 'Enhance Contrast',
                        name: 'enhanceContrast',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to enhance image contrast',
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
                const operation = this.getNodeParameter('operation', i) as string;
                const inputType = this.getNodeParameter('inputType', i) as string;
                const language = this.getNodeParameter('language', i) as string;
                const confidenceThreshold = this.getNodeParameter('confidenceThreshold', i) as number;
                const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
                    detectOrientation?: boolean;
                    removeNoise?: boolean;
                    enhanceContrast?: boolean;
                };

                let imageData: string;

                // Get image data based on input type
                if (inputType === 'binary') {
                    const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
                    const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
                    imageData = Buffer.from(binaryData.data, 'base64').toString('base64');
                } else if (inputType === 'url') {
                    const imageUrl = this.getNodeParameter('imageUrl', i) as string;
                    // Download image and convert to base64
                    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                    imageData = Buffer.from(response.data).toString('base64');
                } else {
                    imageData = this.getNodeParameter('base64Image', i) as string;
                }

                // Call OCR API
                const response = await axios.post(
                    `${gatewayUrl}/api/ocr/extract`,
                    {
                        image: imageData,
                        language: language === 'auto' ? undefined : language,
                        confidence_threshold: confidenceThreshold,
                        detect_orientation: additionalOptions.detectOrientation,
                        remove_noise: additionalOptions.removeNoise,
                        enhance_contrast: additionalOptions.enhanceContrast,
                        include_boxes: operation === 'extractWithBoxes',
                    },
                    {
                        headers: {
                            'X-API-Key': apiKey,
                            'Content-Type': 'application/json',
                        },
                    },
                );

                const ocrResult = response.data;

                // Format output based on operation
                if (operation === 'extractText') {
                    returnData.push({
                        json: {
                            text: ocrResult.text,
                            confidence: ocrResult.confidence,
                            language: ocrResult.detected_language,
                            processing_time: ocrResult.processing_time,
                        },
                        pairedItem: { item: i },
                    });
                } else {
                    returnData.push({
                        json: {
                            text: ocrResult.text,
                            confidence: ocrResult.confidence,
                            language: ocrResult.detected_language,
                            bounding_boxes: ocrResult.bounding_boxes,
                            word_count: ocrResult.word_count,
                            processing_time: ocrResult.processing_time,
                        },
                        pairedItem: { item: i },
                    });
                }
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
