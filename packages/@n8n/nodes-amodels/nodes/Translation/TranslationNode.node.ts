import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';
import axios from 'axios';

export class TranslationNode implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'aModels Translation',
        name: 'aModelsTranslation',
        icon: 'file:translation.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["sourceLang"]}} → {{$parameter["targetLang"]}}',
        description: 'Translate text using JEPA translation service',
        defaults: {
            name: 'aModels Translation',
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
                displayName: 'Text',
                name: 'text',
                type: 'string',
                typeOptions: {
                    rows: 4,
                },
                default: '',
                required: true,
                description: 'The text to translate',
            },
            {
                displayName: 'Source Language',
                name: 'sourceLang',
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
                    {
                        name: 'French',
                        value: 'fr',
                    },
                    {
                        name: 'German',
                        value: 'de',
                    },
                    {
                        name: 'Spanish',
                        value: 'es',
                    },
                ],
                default: 'auto',
                description: 'The source language of the text',
            },
            {
                displayName: 'Target Language',
                name: 'targetLang',
                type: 'options',
                options: [
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
                    {
                        name: 'French',
                        value: 'fr',
                    },
                    {
                        name: 'German',
                        value: 'de',
                    },
                    {
                        name: 'Spanish',
                        value: 'es',
                    },
                ],
                default: 'en',
                required: true,
                description: 'The target language for translation',
            },
            {
                displayName: 'Translation Method',
                name: 'method',
                type: 'options',
                options: [
                    {
                        name: 'Beam Search',
                        value: 'beam',
                        description: 'High quality, slower (recommended)',
                    },
                    {
                        name: 'Greedy',
                        value: 'greedy',
                        description: 'Fast, good quality',
                    },
                    {
                        name: 'Sampling',
                        value: 'sampling',
                        description: 'Creative, varied output',
                    },
                ],
                default: 'beam',
                description: 'The translation method to use',
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
                        displayOptions: {
                            show: {
                                '/method': ['sampling'],
                            },
                        },
                        description: 'Sampling temperature (0-2). Higher = more creative.',
                    },
                    {
                        displayName: 'Beam Width',
                        name: 'beamWidth',
                        type: 'number',
                        typeOptions: {
                            minValue: 1,
                            maxValue: 10,
                        },
                        default: 5,
                        displayOptions: {
                            show: {
                                '/method': ['beam'],
                            },
                        },
                        description: 'Number of beams for beam search (1-10)',
                    },
                    {
                        displayName: 'Max Length',
                        name: 'maxLength',
                        type: 'number',
                        default: 512,
                        description: 'Maximum length of translated text',
                    },
                    {
                        displayName: 'Preserve Formatting',
                        name: 'preserveFormatting',
                        type: 'boolean',
                        default: true,
                        description: 'Whether to preserve line breaks and formatting',
                    },
                    {
                        displayName: 'Return Alternatives',
                        name: 'returnAlternatives',
                        type: 'boolean',
                        default: false,
                        description: 'Whether to return alternative translations',
                    },
                    {
                        displayName: 'Number of Alternatives',
                        name: 'numAlternatives',
                        type: 'number',
                        typeOptions: {
                            minValue: 1,
                            maxValue: 5,
                        },
                        default: 3,
                        displayOptions: {
                            show: {
                                returnAlternatives: [true],
                            },
                        },
                        description: 'Number of alternative translations to return',
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
                const text = this.getNodeParameter('text', i) as string;
                const sourceLang = this.getNodeParameter('sourceLang', i) as string;
                const targetLang = this.getNodeParameter('targetLang', i) as string;
                const method = this.getNodeParameter('method', i) as string;
                const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as {
                    temperature?: number;
                    beamWidth?: number;
                    maxLength?: number;
                    preserveFormatting?: boolean;
                    returnAlternatives?: boolean;
                    numAlternatives?: number;
                };

                // Build request payload
                const payload: any = {
                    text,
                    source_lang: sourceLang === 'auto' ? undefined : sourceLang,
                    target_lang: targetLang,
                    method,
                    max_length: additionalOptions.maxLength,
                    preserve_formatting: additionalOptions.preserveFormatting,
                };

                // Add method-specific parameters
                if (method === 'beam' && additionalOptions.beamWidth) {
                    payload.beam_width = additionalOptions.beamWidth;
                } else if (method === 'sampling' && additionalOptions.temperature) {
                    payload.temperature = additionalOptions.temperature;
                }

                // Add alternatives if requested
                if (additionalOptions.returnAlternatives) {
                    payload.num_alternatives = additionalOptions.numAlternatives || 3;
                }

                // Call Translation API
                const response = await axios.post(
                    `${gatewayUrl}/api/translation/translate`,
                    payload,
                    {
                        headers: {
                            'X-API-Key': apiKey,
                            'Content-Type': 'application/json',
                        },
                    },
                );

                const translationResult = response.data;

                // Format output
                const outputData: any = {
                    original_text: text,
                    translated_text: translationResult.translated_text,
                    source_language: translationResult.detected_source_lang || sourceLang,
                    target_language: targetLang,
                    method,
                    confidence: translationResult.confidence,
                    processing_time: translationResult.processing_time,
                };

                // Add alternatives if available
                if (translationResult.alternatives) {
                    outputData.alternatives = translationResult.alternatives;
                }

                returnData.push({
                    json: outputData,
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
