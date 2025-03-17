/**
 * Schema definition for the Deep Research tool
 */

/**
 * Input schema for the Deep Research tool
 */
export const researchToolInputSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Research query or question',
    },
    depth: {
      type: 'string',
      enum: ['basic', 'standard', 'deep'],
      description: 'Depth of research (basic: quick answers, standard: comprehensive, deep: exhaustive)',
      default: 'standard'
    },
    maxSources: {
      type: 'number',
      description: 'Maximum number of sources to include in the response',
      default: 10
    }
  },
  required: ['query'],
};

/**
 * Tool definition for the Deep Research
 */
export const researchToolDefinition = {
  name: 'deep-research',
  description: 'Perform multi-step research on a complex query, synthesizing information from multiple sources with proper citations.',
  inputSchema: researchToolInputSchema,
};
