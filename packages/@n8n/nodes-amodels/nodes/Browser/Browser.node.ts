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

export class Browser implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Browser Automation',
        name: 'browser',
        group: ['transform'],
        version: 1,
        description: 'Automate browser interactions via the Browser Service',
        defaults: {
            name: 'Browser Automation',
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
                        name: 'Navigate',
                        value: 'navigate',
                        description: 'Navigate to a URL',
                        action: 'Navigate to URL',
                    },
                    {
                        name: 'Click Element',
                        value: 'click',
                        description: 'Click an element on the page',
                        action: 'Click element',
                    },
                    {
                        name: 'Fill Form',
                        value: 'fill',
                        description: 'Fill a form field',
                        action: 'Fill form',
                    },
                    {
                        name: 'Screenshot',
                        value: 'screenshot',
                        description: 'Take a screenshot of the page',
                        action: 'Take screenshot',
                    },
                    {
                        name: 'Extract Data',
                        value: 'extract',
                        description: 'Extract data from the page',
                        action: 'Extract data',
                    },
                    {
                        name: 'Execute Script',
                        value: 'executeScript',
                        description: 'Execute custom JavaScript',
                        action: 'Execute script',
                    },
                ],
                default: 'navigate',
            },
            // Navigate
            {
                displayName: 'URL',
                name: 'url',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['navigate'],
                    },
                },
                description: 'The URL to navigate to',
            },
            // Click / Fill / Extract
            {
                displayName: 'Selector',
                name: 'selector',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['click', 'fill', 'extract'],
                    },
                },
                description: 'CSS selector of the element',
            },
            // Fill
            {
                displayName: 'Value',
                name: 'value',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['fill'],
                    },
                },
                description: 'Value to type into the field',
            },
            // Execute Script
            {
                displayName: 'Script',
                name: 'script',
                type: 'string',
                default: 'return document.title;',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['executeScript'],
                    },
                },
                description: 'JavaScript code to execute',
            },
            // Screenshot
            {
                displayName: 'Full Page',
                name: 'fullPage',
                type: 'boolean',
                default: false,
                displayOptions: {
                    show: {
                        operation: ['screenshot'],
                    },
                },
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
                const baseUrl = `${credentials.gatewayUrl}/api/browser`;

                if (operation === 'navigate') {
                    const url = this.getNodeParameter('url', itemIndex) as string;
                    response = await axios.post(`${baseUrl}/navigate`, { url }, { headers });
                } else if (operation === 'click') {
                    const selector = this.getNodeParameter('selector', itemIndex) as string;
                    response = await axios.post(`${baseUrl}/click`, { selector }, { headers });
                } else if (operation === 'fill') {
                    const selector = this.getNodeParameter('selector', itemIndex) as string;
                    const value = this.getNodeParameter('value', itemIndex) as string;
                    response = await axios.post(`${baseUrl}/type`, { selector, text: value }, { headers });
                } else if (operation === 'screenshot') {
                    const fullPage = this.getNodeParameter('fullPage', itemIndex) as boolean;
                    response = await axios.post(`${baseUrl}/screenshot`, { full_page: fullPage }, { headers });
                } else if (operation === 'extract') {
                    const selector = this.getNodeParameter('selector', itemIndex) as string;
                    response = await axios.post(`${baseUrl}/extract`, { selector }, { headers });
                } else if (operation === 'executeScript') {
                    const script = this.getNodeParameter('script', itemIndex) as string;
                    response = await axios.post(`${baseUrl}/execute`, { script }, { headers });
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
                            operation: 'browser',
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
