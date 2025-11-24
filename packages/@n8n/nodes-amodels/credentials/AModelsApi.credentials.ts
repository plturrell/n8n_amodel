import {
    IAuthenticateGeneric,
    ICredentialTestRequest,
    ICredentialType,
    INodeProperties,
} from 'n8n-workflow';

export class AModelsApi implements ICredentialType {
    name = 'aModelsApi';
    displayName = 'aModels API';
    documentationUrl = 'https://docs.amodels.io/api';
    properties: INodeProperties[] = [
        {
            displayName: 'Gateway URL',
            name: 'gatewayUrl',
            type: 'string',
            default: 'http://localhost:8000',
            placeholder: 'http://localhost:8000',
            description: 'The base URL of the aModels Gateway API',
        },
        {
            displayName: 'API Key',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            description: 'The API key for authenticating with aModels services',
        },
    ];

    authenticate: IAuthenticateGeneric = {
        type: 'generic',
        properties: {
            headers: {
                'X-API-Key': '={{$credentials.apiKey}}',
            },
        },
    };

    test: ICredentialTestRequest = {
        request: {
            baseURL: '={{$credentials.gatewayUrl}}',
            url: '/api/health',
        },
    };
}
