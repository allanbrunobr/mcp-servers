/**
 * Schema definition for the Serper Google search tool
 */

/**
 * Input schema for the Google search tool
 */
export const searchToolInputSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Search query',
    },
    numResults: {
      type: 'number',
      description: 'Number of results to return (default: 10)',
      minimum: 1,
      maximum: 100,
    },
    gl: {
      type: 'string',
      description: 'Country code (e.g., "us", "uk")',
      pattern: '^[a-z]{2}$',
    },
    hl: {
      type: 'string',
      description: 'Language code (e.g., "en", "es")',
      pattern: '^[a-z]{2}(-[A-Z]{2})?$',
    },
    autocorrect: {
      type: 'boolean',
      description: 'Enable query autocorrection',
    },
  },
  required: ['query'],
};

/**
 * Tool definition for the Serper Google search
 */
export const searchToolDefinition = {
  name: 'serper-google-search',
  description: 'Perform a Google search using the SERPER API. Returns rich search results including knowledge graph, organic results, related questions, and more.',
  inputSchema: searchToolInputSchema,
};
