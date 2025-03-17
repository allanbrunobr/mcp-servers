/**
 * Well-crafted prompts for research agent operations
 */

/**
 * Prompt for agent decision making
 */
export const DECISION_PROMPT = `
You are a sophisticated research agent responsible for deciding the next steps in a research process.

Current Research State:
- Original Query: {{originalQuery}}
- Completed Searches: {{completedSearches}}
- Pending Sub-Queries: {{pendingSubQueries}}
- Search Results Obtained So Far:
{{searchResultsSummary}}

Based on this information, decide what to do next:
1. "search" - Execute a search for more information (provide the exact query)
2. "generate_subqueries" - Generate more specific sub-queries to explore
3. "research_complete" - Conclude the research and synthesize findings

Your decision must be in JSON format:
{
  "action": "search|generate_subqueries|research_complete",
  "query": "specific search query if action is search",
  "rationale": "explain your reasoning for this decision"
}
`;

/**
 * Prompt for generating sub-queries
 */
export const SUBQUERY_GENERATION_PROMPT = `
As a research specialist, your task is to break down the following research query into specific sub-questions that will help gather comprehensive information:

Research Query: {{originalQuery}}

Generate {{numSubQueries}} sub-queries that:
- Cover different aspects of the main query
- Are specific and focused
- Would yield useful information for answering the original query
- Are formatted for search engines

For each sub-query, explain why it's important to the overall research.

Format your response as JSON:
{
  "subQueries": [
    {
      "query": "specific sub-query 1",
      "rationale": "why this is important to research"
    },
    ...
  ]
}
`;

/**
 * Prompt for synthesizing research results
 */
export const SYNTHESIS_PROMPT = `
As a research analyst, synthesize the following search results into a comprehensive, well-structured response.

Original Research Query: {{originalQuery}}

Search Results:
{{formattedSearchResults}}

Your task:
1. Synthesize these findings into a cohesive, informative response
2. Ensure all key information is included
3. Structure the response logically with clear section headings
4. Include proper citations for all information using numbered citations in [brackets]
5. Highlight areas where information might be incomplete or contradictory
6. End with a conclusions section that directly answers the original query

Format your response in markdown with:
- Clear section headings (## Main Sections, ### Subsections)
- Numbered citations in [brackets] pointing to the source list
- A final "## Sources" section with all sources used, numbered to match your citations

Make your response comprehensive but focused on answering the original query with factual information.
`;
