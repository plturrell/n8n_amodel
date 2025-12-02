import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';
import axios from 'axios';

export class ResearchSuiteNode implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'aModels Research Suite',
        name: 'aModelsResearchSuite',
        icon: 'file:research.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"]}}',
        description: 'Interact with aModels Research Suite services',
        defaults: {
            name: 'aModels Research Suite',
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
                        name: 'Generate Queries',
                        value: 'generateQueries',
                        description: 'Generate search queries from a topic',
                    },
                    {
                        name: 'Search',
                        value: 'search',
                        description: 'Execute search queries',
                    },
                    {
                        name: 'Synthesize',
                        value: 'synthesize',
                        description: 'Synthesize search results into a report',
                    },
                    {
                        name: 'Table Analysis',
                        value: 'tableAnalysis',
                        description: 'Detect and analyze tables in documents',
                    },
                    {
                        name: 'Narrative Generation',
                        value: 'narrative',
                        description: 'Generate narrative from data',
                    },
                    {
                        name: 'Deep Research',
                        value: 'deepResearch',
                        description: 'Perform deep research using Open Deep Research',
                    },
                    {
                        name: 'LangGraph Workflow',
                        value: 'langgraph',
                        description: 'Execute LangGraph-based research workflow',
                    },
                ],
                default: 'generateQueries',
            },
            // Generate Queries
            {
                displayName: 'Topic',
                name: 'topic',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['generateQueries'],
                    },
                },
                description: 'The research topic',
            },
            // Search
            {
                displayName: 'Queries (JSON)',
                name: 'queries',
                type: 'json',
                default: '[]',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['search'],
                    },
                },
                description: 'List of search queries',
            },
            // Synthesize
            {
                displayName: 'Topic',
                name: 'topic',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['synthesize'],
                    },
                },
            },
            {
                displayName: 'Search Results (JSON)',
                name: 'searchResults',
                type: 'json',
                default: '[]',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['synthesize'],
                    },
                },
                description: 'Results from search operation',
            },
            // Table Analysis
            {
                displayName: 'Document URL',
                name: 'documentUrl',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['tableAnalysis'],
                    },
                },
            },
            // Narrative
            {
                displayName: 'Data (JSON)',
                name: 'data',
                type: 'json',
                default: '{}',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['narrative'],
                    },
                },
                description: 'Data to generate narrative from',
            },
            // Deep Research
            {
                displayName: 'Research Topic',
                name: 'researchTopic',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['deepResearch'],
                    },
                },
                description: 'Topic for deep research',
            },
            {
                displayName: 'Max Depth',
                name: 'maxDepth',
                type: 'number',
                default: 2,
                displayOptions: {
                    show: {
                        operation: ['deepResearch'],
                    },
                },
                description: 'Maximum recursion depth',
            },
            // LangGraph
            {
                displayName: 'Workflow Input (JSON)',
                name: 'workflowInput',
                type: 'json',
                default: '{}',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['langgraph'],
                    },
                },
                description: 'Input for the LangGraph workflow',
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
                let endpoint = '';
                let payload: any = {};

                if (operation === 'generateQueries') {
                    const topic = this.getNodeParameter('topic', i) as string;
                    endpoint = `${gatewayUrl}/api/research/query-gen`;
                    payload = { topic };
                } else if (operation === 'search') {
                    const queriesStr = this.getNodeParameter('queries', i) as string;
                    const queries = typeof queriesStr === 'string' ? JSON.parse(queriesStr) : queriesStr;
                    endpoint = `${gatewayUrl}/api/research/search`;
                    payload = { queries };
                } else if (operation === 'synthesize') {
                    const topic = this.getNodeParameter('topic', i) as string;
                    const resultsStr = this.getNodeParameter('searchResults', i) as string;
                    const results = typeof resultsStr === 'string' ? JSON.parse(resultsStr) : resultsStr;
                    endpoint = `${gatewayUrl}/api/research/synthesis`;
                    payload = { topic, search_results: results };
                } else if (operation === 'tableAnalysis') {
                    const documentUrl = this.getNodeParameter('documentUrl', i) as string;
                    endpoint = `${gatewayUrl}/api/research/table-analysis/analyze`;
                    payload = { url: documentUrl };
                } else if (operation === 'narrative') {
                    const dataStr = this.getNodeParameter('data', i) as string;
                    const data = typeof dataStr === 'string' ? JSON.parse(dataStr) : dataStr;
                    endpoint = `${gatewayUrl}/api/narrative/generate`;
                    payload = { data };
                } else if (operation === 'deepResearch') {
                    const topic = this.getNodeParameter('researchTopic', i) as string;
                    const maxDepth = this.getNodeParameter('maxDepth', i) as number;
                    endpoint = `${gatewayUrl}/api/deep-research/research`;
                    payload = { topic, max_depth: maxDepth };
                } else if (operation === 'langgraph') {
                    const inputStr = this.getNodeParameter('workflowInput', i) as string;
                    const input = typeof inputStr === 'string' ? JSON.parse(inputStr) : inputStr;
                    endpoint = `${gatewayUrl}/api/deep-research/langgraph`;
                    payload = input;
                }

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
