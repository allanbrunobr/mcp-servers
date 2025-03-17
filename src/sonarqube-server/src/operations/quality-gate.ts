import { z } from 'zod';
import { makeRequest } from '../common/utils.js';
import { GetQualityGateSchema } from '../common/types.js';

export async function getQualityGate(params: z.infer<typeof GetQualityGateSchema>) {
    return await makeRequest('/api/qualitygates/project_status', {
        projectKey: params.projectKey,
    });
}

export { GetQualityGateSchema };
