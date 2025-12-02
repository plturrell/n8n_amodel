import {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';
import axios from 'axios';

export class GNNSpacetime implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'GNN Spacetime',
        name: 'gnnSpacetime',
        group: ['transform'],
        version: 1,
        description: 'Integrate with GNN Spacetime for narrative and financial analysis',
        defaults: {
            name: 'GNN Spacetime',
        },
        inputs: ['main'],
        outputs: ['main'],
        properties: [
            {
                displayName: 'Operation',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Process Financial Document',
                        value: 'processDocument',
                        description: 'Process a financial document and generate a narrative graph',
                    },
                    {
                        name: 'Generate Explanation',
                        value: 'generateExplanation',
                        description: 'Generate a narrative explanation for a storyline',
                    },
                    {
                        name: 'Predict Future',
                        value: 'predictFuture',
                        description: 'Predict future states for a storyline',
                    },
                    {
                        name: 'Detect Anomalies',
                        value: 'detectAnomalies',
                        description: 'Detect anomalies in a storyline',
                    },
                ],
                default: 'processDocument',
            },
            // Process Document Properties
            {
                displayName: 'Source File Path',
                name: 'sourceFile',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['processDocument'],
                    },
                },
                description: 'Path to the source file',
            },
            {
                displayName: 'Graph Data (JSON)',
                name: 'graphData',
                type: 'json',
                default: '{}',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['processDocument'],
                    },
                },
                description: 'Knowledge graph data (nodes and edges)',
            },
            {
                displayName: 'Reporting Basis',
                name: 'reportingBasis',
                type: 'string',
                default: 'GAAP',
                displayOptions: {
                    show: {
                        operation: ['processDocument'],
                    },
                },
            },
            // Storyline Properties
            {
                displayName: 'Storyline ID',
                name: 'storylineId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        operation: ['generateExplanation', 'predictFuture', 'detectAnomalies'],
                    },
                },
            },
            {
                displayName: 'Current Time',
                name: 'currentTime',
                type: 'number',
                default: 0.0,
                displayOptions: {
                    show: {
                        operation: ['generateExplanation', 'predictFuture', 'detectAnomalies'],
                    },
                },
            },
            {
                displayName: 'Time Horizon',
                name: 'timeHorizon',
                type: 'number',
                default: 1.0,
                displayOptions: {
                    show: {
                        operation: ['predictFuture'],
                    },
                },
            },
            {
                displayName: 'API URL',
                name: 'apiUrl',
                type: 'string',
                default: 'http://markitdown:8000',
                description: 'URL of the Markitdown service GNN API',
            },
        ],
    };


    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const operation = this.getNodeParameter('operation', 0) as string;
        const apiUrl = this.getNodeParameter('apiUrl', 0) as string;

        // Retry configuration
        const maxRetries = 3;
        const retryDelay = 1000; // 1 second

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            let lastError: Error | null = null;
            let retryCount = 0;

            // Retry loop
            while (retryCount <= maxRetries) {
                try {
                    let response;
                    let validationErrors: string[] = [];

                    if (operation === 'processDocument') {
                        const sourceFile = this.getNodeParameter('sourceFile', itemIndex) as string;
                        const graphDataRaw = this.getNodeParameter('graphData', itemIndex);
                        const reportingBasis = this.getNodeParameter('reportingBasis', itemIndex) as string;

                        // Validation
                        if (!sourceFile || sourceFile.trim() === '') {
                            validationErrors.push('Source file path is required');
                        }

                        let graphData: object;
                        try {
                            graphData = typeof graphDataRaw === 'string' ? JSON.parse(graphDataRaw) : (graphDataRaw as object);

                            // Validate graph structure
                            if (!graphData || (typeof graphData === 'object' && Object.keys(graphData).length === 0)) {
                                validationErrors.push('Graph data cannot be empty');
                            }
                        } catch (e) {
                            validationErrors.push(`Invalid graph data JSON: ${(e as Error).message}`);
                            graphData = {};
                        }

                        if (validationErrors.length > 0) {
                            throw new NodeOperationError(
                                this.getNode(),
                                `Validation failed: ${validationErrors.join('; ')}`,
                                { itemIndex }
                            );
                        }

                        response = await axios.post(
                            `${apiUrl}/api/gnn/process`,
                            {
                                source_file: sourceFile,
                                graph_data: graphData,
                                reporting_basis: reportingBasis,
                            },
                            {
                                timeout: 60000, // 60 second timeout
                                headers: { 'Content-Type': 'application/json' },
                            }
                        );
                    } else if (operation === 'generateExplanation') {
                        const storylineId = this.getNodeParameter('storylineId', itemIndex) as string;
                        const currentTime = this.getNodeParameter('currentTime', itemIndex) as number;

                        // Validation
                        if (!storylineId || storylineId.trim() === '') {
                            validationErrors.push('Storyline ID is required');
                        }
                        if (typeof currentTime !== 'number' || currentTime < 0) {
                            validationErrors.push('Current time must be a non-negative number');
                        }

                        if (validationErrors.length > 0) {
                            throw new NodeOperationError(
                                this.getNode(),
                                `Validation failed: ${validationErrors.join('; ')}`,
                                { itemIndex }
                            );
                        }

                        response = await axios.post(
                            `${apiUrl}/api/gnn/explain`,
                            {
                                storyline_id: storylineId,
                                current_time: currentTime,
                            },
                            {
                                timeout: 30000,
                                headers: { 'Content-Type': 'application/json' },
                            }
                        );
                    } else if (operation === 'predictFuture') {
                        const storylineId = this.getNodeParameter('storylineId', itemIndex) as string;
                        const currentTime = this.getNodeParameter('currentTime', itemIndex) as number;
                        const timeHorizon = this.getNodeParameter('timeHorizon', itemIndex) as number;

                        // Validation
                        if (!storylineId || storylineId.trim() === '') {
                            validationErrors.push('Storyline ID is required');
                        }
                        if (typeof currentTime !== 'number' || currentTime < 0) {
                            validationErrors.push('Current time must be a non-negative number');
                        }
                        if (typeof timeHorizon !== 'number' || timeHorizon <= 0) {
                            validationErrors.push('Time horizon must be a positive number');
                        }

                        if (validationErrors.length > 0) {
                            throw new NodeOperationError(
                                this.getNode(),
                                `Validation failed: ${validationErrors.join('; ')}`,
                                { itemIndex }
                            );
                        }

                        response = await axios.post(
                            `${apiUrl}/api/gnn/predict`,
                            {
                                storyline_id: storylineId,
                                current_time: currentTime,
                                time_horizon: timeHorizon,
                            },
                            {
                                timeout: 30000,
                                headers: { 'Content-Type': 'application/json' },
                            }
                        );
                    } else if (operation === 'detectAnomalies') {
                        const storylineId = this.getNodeParameter('storylineId', itemIndex) as string;
                        const currentTime = this.getNodeParameter('currentTime', itemIndex) as number;

                        // Validation
                        if (!storylineId || storylineId.trim() === '') {
                            validationErrors.push('Storyline ID is required');
                        }
                        if (typeof currentTime !== 'number' || currentTime < 0) {
                            validationErrors.push('Current time must be a non-negative number');
                        }

                        if (validationErrors.length > 0) {
                            throw new NodeOperationError(
                                this.getNode(),
                                `Validation failed: ${validationErrors.join('; ')}`,
                                { itemIndex }
                            );
                        }

                        response = await axios.post(
                            `${apiUrl}/api/gnn/anomalies`,
                            {
                                storyline_id: storylineId,
                                current_time: currentTime,
                            },
                            {
                                timeout: 30000,
                                headers: { 'Content-Type': 'application/json' },
                            }
                        );
                    }

                    // Success - add metadata
                    const responseData = response?.data || {};
                    returnData.push({
                        json: {
                            ...responseData,
                            _metadata: {
                                operation,
                                timestamp: new Date().toISOString(),
                                apiUrl,
                                retryCount,
                            },
                        },
                        pairedItem: { item: itemIndex },
                    });

                    // Break retry loop on success
                    break;
                } catch (error) {
                    lastError = error as Error;
                    retryCount++;

                    // Check if error is retryable
                    const isRetryable =
                        axios.isAxiosError(error) &&
                        (error.code === 'ECONNREFUSED' ||
                            error.code === 'ETIMEDOUT' ||
                            error.code === 'ECONNRESET' ||
                            (error.response?.status && error.response.status >= 500));

                    // If not retryable or max retries reached, throw immediately
                    if (!isRetryable || retryCount > maxRetries) {
                        if (this.continueOnFail()) {
                            returnData.push({
                                json: {
                                    error: lastError.message,
                                    operation,
                                    retryCount: retryCount - 1,
                                    timestamp: new Date().toISOString(),
                                },
                                pairedItem: { item: itemIndex },
                            });
                            break;
                        }
                        throw new NodeOperationError(
                            this.getNode(),
                            `GNN API request failed after ${retryCount - 1} retries: ${lastError.message}`,
                            { itemIndex }
                        );
                    }

                    // Wait before retrying
                    if (retryCount <= maxRetries) {
                        await new Promise((resolve) => setTimeout(resolve, retryDelay * retryCount));
                    }
                }
            }
        }

        return [returnData];
    }
}

