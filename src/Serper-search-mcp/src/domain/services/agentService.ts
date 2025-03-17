/**
 * Service for agent decision making and sub-query generation
 */
import { v4 as uuidv4 } from 'uuid';
import { LLMAdapter } from '../../adapters/llm/llmAdapter.js';
import { DECISION_PROMPT, SUBQUERY_GENERATION_PROMPT } from '../prompts/researchPrompts.js';
import { ResearchState, AgentDecision, SubQuery } from '../types/research.js';
import { config } from '../../infrastructure/config/environment.js';

/**
 * Service that handles agent decision making and query generation
 */
export class AgentService {
  /**
   * Makes a decision about the next research step
   */
  async makeDecision(state: ResearchState, llmAdapter: LLMAdapter): Promise<AgentDecision> {
    // Replace template variables in the prompt
    const filledPrompt = DECISION_PROMPT
      .replace('{{originalQuery}}', state.originalQuery)
      .replace('{{completedSearches}}', state.completedSubQueries.length > 0 
        ? state.completedSubQueries.map(q => `- ${q}`).join('\n') 
        : '- None yet')
      .replace('{{pendingSubQueries}}', state.pendingSubQueries.length > 0 
        ? state.pendingSubQueries.map(q => `- ${q}`).join('\n') 
        : '- None')
      .replace('{{searchResultsSummary}}', this.formatSearchResultsSummary(state));
    
    // Request decision from LLM
    const decisionText = await llmAdapter.generateCompletion(filledPrompt, {
      temperature: 0.2, // Low temperature for more deterministic responses
      maxTokens: 500
    });
    
    try {
      // Parse the JSON response
      const decision = JSON.parse(decisionText) as AgentDecision;
      
      // Validate the decision
      if (!['search', 'generate_subqueries', 'research_complete'].includes(decision.action)) {
        throw new Error(`Invalid action: ${decision.action}`);
      }
      
      if (decision.action === 'search' && !decision.query) {
        throw new Error('Search action requires a query');
      }
      
      return decision;
    } catch (error) {
      console.error('Failed to parse agent decision:', error);
      
      // Fallback decision if parsing fails
      return {
        action: state.searchResults.length > 0 ? 'research_complete' : 'search',
        query: state.pendingSubQueries[0] || state.originalQuery,
        rationale: 'Fallback decision due to parsing error'
      };
    }
  }
  
  /**
   * Generates sub-queries for the research
   */
  async generateSubQueries(
    query: string, 
    llmAdapter: LLMAdapter, 
    depth: 'basic' | 'standard' | 'deep' = 'standard'
  ): Promise<SubQuery[]> {
    const depthSettings = config.researchDepthSettings[depth];
    const numSubQueries = depthSettings.maxSubQueries;
    
    // Replace template variables in the prompt
    const filledPrompt = SUBQUERY_GENERATION_PROMPT
      .replace('{{originalQuery}}', query)
      .replace('{{numSubQueries}}', numSubQueries.toString());
    
    // Request sub-queries from LLM
    const subQueriesText = await llmAdapter.generateCompletion(filledPrompt, {
      temperature: 0.7, // Higher temperature for more diverse sub-queries
      maxTokens: 1000
    });
    
    try {
      // Parse the JSON response
      const response = JSON.parse(subQueriesText) as { subQueries: Array<{ query: string, rationale: string }> };
      
      // Convert to SubQuery objects with IDs
      return response.subQueries.map(sq => ({
        id: uuidv4(),
        query: sq.query,
        rationale: sq.rationale,
        status: 'pending'
      }));
    } catch (error) {
      console.error('Failed to parse sub-queries:', error);
      
      // Fallback: generate a single sub-query
      return [{
        id: uuidv4(),
        query,
        rationale: 'Direct search of the original query due to parsing error',
        status: 'pending'
      }];
    }
  }
  
  /**
   * Formats search results for prompt inclusion
   */
  private formatSearchResultsSummary(state: ResearchState): string {
    if (state.searchResults.length === 0) {
      return 'No search results yet.';
    }
    
    return state.searchResults.map(result => {
      const organicResults = result.results.organic || [];
      const snippets = organicResults
        .slice(0, 3)
        .map(r => `- ${r.title}: ${r.snippet}`)
        .join('\n');
      
      return `Search for "${result.query}":\n${snippets}\n`;
    }).join('\n');
  }
}
