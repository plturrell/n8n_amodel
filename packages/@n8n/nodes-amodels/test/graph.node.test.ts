import axios from 'axios';
import { PublishToGraph } from '../nodes/Graph/PublishToGraph.node';
import { createExecuteContext } from './helpers';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PublishToGraph node', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('sends graph payloads to the gateway API', async () => {
        mockedAxios.post.mockResolvedValue({
            data: { batchId: 'batch-1', status: 'applied' },
        });

        const node = new PublishToGraph();
        const execContext = createExecuteContext([
            {
                validationMode: 'checksum',
                namespace: 'kb',
                payloadJson: '{"batchId":"batch-1","nodes":[]}',
            },
        ]);

        const [result] = await node.execute.call(execContext);

        expect(mockedAxios.post).toHaveBeenCalledWith(
            'https://gateway.local/api/graph/publish',
            expect.objectContaining({
                namespace: 'kb',
                validation_mode: 'checksum',
            }),
            expect.any(Object),
        );

        expect(result[0].json).toMatchObject({
            namespace: 'kb',
            validationMode: 'checksum',
        });
    });
});

