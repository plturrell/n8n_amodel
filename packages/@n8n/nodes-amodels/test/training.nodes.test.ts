import axios from 'axios';
import { SubmitLnnTraining } from '../nodes/Training/SubmitLnnTraining.node';
import { SubmitGnnTraining } from '../nodes/Training/SubmitGnnTraining.node';
import { createExecuteContext } from './helpers';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Training nodes', () => {
    beforeEach(() => {
        mockedAxios.post.mockResolvedValue({
            data: { job_id: 'job-123', status: 'queued' },
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('submits LNN training with parsed hyperparameters', async () => {
        const node = new SubmitLnnTraining();
        const execContext = createExecuteContext([
            {
                datasetId: 'dataset-lnn',
                hyperparametersJson: '{"learning_rate":0.1}',
                notes: 'nightly',
            },
        ]);

        const [result] = await node.execute.call(execContext);

        expect(mockedAxios.post).toHaveBeenCalledWith(
            'https://gateway.local/api/training/lnn/jobs',
            expect.objectContaining({
                dataset_id: 'dataset-lnn',
                hyperparameters: { learning_rate: 0.1 },
            }),
            expect.any(Object),
        );

        expect(result[0].json).toMatchObject({
            modelType: 'lnn',
            datasetId: 'dataset-lnn',
        });
    });

    it('throws on invalid hyperparameters JSON for GNN jobs', async () => {
        const node = new SubmitGnnTraining();
        const execContext = createExecuteContext([
            {
                datasetId: 'dataset-gnn',
                topologyTag: 'nav-graph',
                hyperparametersJson: '{invalid}',
            },
        ]);

        await expect(node.execute.call(execContext)).rejects.toThrow('Invalid hyperparameter JSON');
        expect(mockedAxios.post).not.toHaveBeenCalled();
    });
});

