import { z } from 'zod';
import { makeRequest } from '../common/utils.js';
import { GetProjectMetricsSchema } from '../common/types.js';

export async function getProjectMetrics(params: z.infer<typeof GetProjectMetricsSchema>) {
    const metrics = params.metrics?.join(',') || 'coverage,bugs,vulnerabilities,code_smells,security_hotspots';
    
    return await makeRequest('/api/measures/component', {
        component: params.projectKey,
        metricKeys: metrics,
    });
}

export { GetProjectMetricsSchema };
