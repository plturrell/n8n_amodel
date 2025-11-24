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

export class SubmitLnnTraining implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Submit LNN Training',
        name: 'submitLnnTraining',
        group: ['transform'],
        version: 1,
        description: 'Submit a lattice neural network training run via the GPU orchestrator',
        defaults: {
            name: 'Submit LNN Training',
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
                description: 'Identifier of the curated dataset to train against',
            },
            {
                displayName: 'Hyperparameters (JSON)',
                name: 'hyperparametersJson',
                type: 'json',
                default: '{\n  "learning_rate": 0.001,\n  "epochs": 10\n}',
                description: 'JSON payload forwarded as-is to the GPU orchestrator',
            },
            {
                displayName: 'Notes',
                name: 'notes',
                type: 'string',
                typeOptions: {
                    rows: 2,
                },
                default: '',
                description: 'Optional annotation stored with the training job',
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
                const hyperparametersJson = this.getNodeParameter('hyperparametersJson', itemIndex) as string;
                const notes = this.getNodeParameter('notes', itemIndex, '') as string;

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
                    hyperparameters,
                    metadata: {
                        model_type: 'lnn',
                        notes,
                        triggered_by: 'n8n',
                    },
                };

                const response = await axios.post(
                    `${credentials.gatewayUrl}/api/training/lnn/jobs`,
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
                        hyperparameters,
                        modelType: 'lnn',
                    },
                    pairedItem: { item: itemIndex },
                });
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({
                        json: {
                            error: (error as Error).message,
                            modelType: 'lnn',
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

