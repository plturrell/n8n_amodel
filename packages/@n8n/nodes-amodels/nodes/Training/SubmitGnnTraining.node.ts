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

export class SubmitGnnTraining implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Submit GNN Training',
        name: 'submitGnnTraining',
        group: ['transform'],
        version: 1,
        description: 'Submit a graph neural network training run',
        defaults: {
            name: 'Submit GNN Training',
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
                displayName: 'Dataset ID',
                name: 'datasetId',
                type: 'string',
                default: '',
                required: true,
                description: 'Graph dataset identifier registered in the training service',
            },
            {
                displayName: 'Topology Tag',
                name: 'topologyTag',
                type: 'string',
                default: 'default',
                description: 'Optional topology or feature set tag',
            },
            {
                displayName: 'Hyperparameters (JSON)',
                name: 'hyperparametersJson',
                type: 'json',
                default: '{\n  "learning_rate": 0.0005,\n  "layers": 6\n}',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const credentials = (await this.getCredentials('aModelsApi')) as GatewayCredentials;

        for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
            try {
                const datasetId = this.getNodeParameter('datasetId', itemIndex) as string;
                const topologyTag = this.getNodeParameter('topologyTag', itemIndex, 'default') as string;
                const hyperparametersJson = this.getNodeParameter('hyperparametersJson', itemIndex) as string;

                let hyperparameters: Record<string, unknown> = {};
                if (hyperparametersJson) {
                    try {
                        hyperparameters =
                            typeof hyperparametersJson === 'string'
                                ? JSON.parse(hyperparametersJson)
                                : (hyperparametersJson as Record<string, unknown>);
                    } catch (error) {
                        throw new NodeOperationError(
                            this.getNode(),
                            `Invalid hyperparameter JSON: ${(error as Error).message}`,
                            { itemIndex },
                        );
                    }
                }

                const payload = {
                    dataset_id: datasetId,
                    topology_tag: topologyTag,
                    hyperparameters,
                    metadata: {
                        model_type: 'gnn',
                        triggered_by: 'n8n',
                    },
                };

                const response = await axios.post(
                    `${credentials.gatewayUrl}/api/training/gnn/jobs`,
                    payload,
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
                        datasetId,
                        topologyTag,
                        hyperparameters,
                        modelType: 'gnn',
                    },
                    pairedItem: { item: itemIndex },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: (error as Error).message,
                            modelType: 'gnn',
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

