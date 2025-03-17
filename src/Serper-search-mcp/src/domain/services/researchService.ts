/**
 * Core research service with main business logic
 */
import { v4 as uuidv4 } from 'uuid';
import { LLMAdapter } from '../../adapters/llm/llmAdapter.js';
import { SYNTHESIS_PROMPT } from '../prompts/researchPrompts.js';
import { 
  ResearchRequest, 
  ResearchState, 
  ResearchResult,
  AgentDecision,
  Citation,
  SubQuery
} from '../types/research.js';
import { SerperResponse } from '../types/serper.js';

/**
 * Service for core research functionality
 */
export class ResearchService {
  /**
   * Initializes a new research state
   */
  initializeState(request: ResearchRequest): ResearchState {
    return {
      originalQuery: request.query,
      subQueries: [],
      searchResults: [],
      completedSubQueries: [],
      pendingSubQueries: [],
      citations: [],
      status: 'in_progress'
    };
  }
  
  /**
   * Updates state based on agent decision
   */
  processAgentDecision(
    state: ResearchState, 
    decision: AgentDecision
  ): ResearchState {
    // Clone state to avoid direct mutations
    const newState = { ...state };
    
    if (decision.action === 'research_complete') {
      newState.status = 'complete';
    }
    
    return newState;
  }
  
  /**
   * Updates state with new search results
   */
  updateStateWithResults(
    state: ResearchState, 
    query: string, 
    results: SerperResponse
  ): ResearchState {
    // Clone state to avoid direct mutations
    const newState = { 
      ...state,
      searchResults: [...state.searchResults],
      completedSubQueries: [...state.completedSubQueries],
      pendingSubQueries: [...state.pendingSubQueries],
      citations: [...state.citations]
    };
    
    // Add new search result
    newState.searchResults.push({
      query,
      results,
      timestamp: Date.now()
    });
    
    // Update completed queries
    if (!newState.completedSubQueries.includes(query)) {
      newState.completedSubQueries.push(query);
    }
    
    // Remove from pending queries if present
    newState.pendingSubQueries = newState.pendingSubQueries.filter(q => q !== query);
    
    // Update subquery status
    newState.subQueries = newState.subQueries.map(sq => 
      sq.query === query ? { ...sq, status: 'completed' } : sq
    );
    
    // Extract citations from results
    const newCitations = this.extractCitationsFromResults(query, results);
    newState.citations = [...newState.citations, ...newCitations];
    
    return newState;
  }
  
  /**
   * Updates state with new sub-queries
   */
  updateStateWithSubQueries(
    state: ResearchState, 
    subQueries: SubQuery[]
  ): ResearchState {
    // Clone state to avoid direct mutations
    const newState = { 
      ...state,
      subQueries: [...state.subQueries],
      pendingSubQueries: [...state.pendingSubQueries]
    };
    
    // Add sub-queries that aren't already in the state
    const existingQueries = new Set([
      ...newState.completedSubQueries,
      ...newState.pendingSubQueries,
      ...newState.subQueries.map(sq => sq.query)
    ]);
    
    subQueries.forEach(sq => {
      if (!existingQueries.has(sq.query)) {
        newState.pendingSubQueries.push(sq.query);
        newState.subQueries.push(sq);
        existingQueries.add(sq.query);
      }
    });
    
    return newState;
  }
  
  /**
   * Synthesizes final research results
   */
  async synthesizeResults(
    state: ResearchState,
    llmAdapter: LLMAdapter
  ): Promise<ResearchResult> {
    // Format search results for the synthesis prompt
    const formattedResults = this.formatSearchResultsForSynthesis(state);
    
    // Replace template variables in the prompt
    const filledPrompt = SYNTHESIS_PROMPT
      .replace('{{originalQuery}}', state.originalQuery)
      .replace('{{formattedSearchResults}}', formattedResults);
    
    // Request synthesis from LLM
    const synthesisText = await llmAdapter.generateCompletion(filledPrompt, {
      temperature: 0.3,
      maxTokens: 2000
    });
    
    return {
      answer: synthesisText,
      citations: state.citations,
      subQueriesGenerated: state.subQueries.length,
      subQueriesCompleted: state.completedSubQueries.length,
      searchesPerformed: state.searchResults.length
    };
  }
  
  /**
   * Extracts citations from search results
   */
  private extractCitationsFromResults(query: string, results: SerperResponse): Citation[] {
    const citations: Citation[] = [];
    
    if (results.organic && Array.isArray(results.organic)) {
      results.organic.forEach((result, index) => {
        if (result.title && result.link) {
          citations.push({
            id: uuidv4(),
            title: result.title,
            url: result.link,
            snippet: result.snippet || '',
            relevanceScore: 1 - (index * 0.1) // Simple relevance score based on position
          });
        }
      });
    }
    
    return citations;
  }
  
  /**
   * Formats search results for synthesis prompt
   */
  private formatSearchResultsForSynthesis(state: ResearchState): string {
    if (state.searchResults.length === 0) {
      return 'No search results available.';
    }
    
    return state.searchResults.map((result, resultIndex) => {
      const organicResults = result.results.organic || [];
      const formattedResults = organicResults
        .slice(0, 5)
        .map((r, i) => {
          const resultNum = resultIndex * 5 + i + 1;
          return `[${resultNum}] ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet || 'No snippet available'}\n`;
        })
        .join('\n');
      
      return `## Results for "${result.query}":\n${formattedResults}`;
    }).join('\n\n');
  }
}
