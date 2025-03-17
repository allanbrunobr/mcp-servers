import { z } from 'zod';
import { makeRequest } from '../common/utils.js';
import { GetIssuesSchema } from '../common/types.js';

export async function getIssues(params: z.infer<typeof GetIssuesSchema>) {
    return await makeRequest('/api/issues/search', {
        componentKeys: params.projectKey,
        types: params.types?.join(','),
        severities: params.severities?.join(','),
        statuses: params.statuses?.join(','),
    });
}

export { GetIssuesSchema };
