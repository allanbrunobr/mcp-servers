import { z } from 'zod';
import { makePostRequest } from '../common/utils.js';
import { CreateProjectSchema } from '../common/types.js';

export async function createProject(params: z.infer<typeof CreateProjectSchema>) {
    return await makePostRequest('/api/projects/create', {
        name: params.name,
        project: params.projectKey,
        visibility: params.visibility || 'private',
    });
}

export { CreateProjectSchema };
