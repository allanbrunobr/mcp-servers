/**
 * Orchestrates the research process with an event loop
 */
import { ResearchService } from '../../domain/services/researchService.js';
import { AgentService } from '../../domain/services/agentService.js';
import { SearchService } from '../../domain/services/searchService.js';
import { LLMAdapter } from '../../adapters/llm/llmAdapter.js';
import { 
  ResearchRequest, 
  ResearchState, 
  ResearchResult
} from '../../domain/types/research.js';
import { config } from '../../infrastructure/config/environment.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

/**
 * Orchestrates the research process through an event loop
 */
export class ResearchOrchestrator {
  private researchService: ResearchService;
  private agentService: AgentService;
  private searchService: SearchService;
  private llmAdapter: LLMAdapter;
  
  /**
   * Creates a new research orchestrator
   */
  constructor(
    researchService: ResearchService,
    agentService: AgentService,
    searchService: SearchService,
    llmAdapter: LLMAdapter
  ) {
    this.researchService = researchService;
    this.agentService = agentService;
    this.searchService = searchService;
    this.llmAdapter = llmAdapter;
  }
  
  /**
   * Main method to execute the research process
   */
  async executeResearch(request: ResearchRequest): Promise<ResearchResult> {
    // Validate request
    this.validateRequest(request);
    
    // Initialize research state
    let state: ResearchState = this.researchService.initializeState(request);
    let iterationCount = 0;
    const maxIterations = this.getMaxIterations(request.depth || 'standard');
    
    // Begin event loop
    while (state.status !== 'complete' && iterationCount < maxIterations) {
      iterationCount++;
      console.log(`Research iteration ${iterationCount}/${maxIterations}`);
      
      try {
        // If no queries pending and no subqueries generated yet, generate initial subqueries
        if (state.pendingSubQueries.length === 0 && state.subQueries.length === 0) {
          const subQueries = await this.agentService.generateSubQueries(
            request.query,
            this.llmAdapter,
            request.depth
          );
          state = this.researchService.updateStateWithSubQueries(
            state,
            subQueries
          );
          continue;
        }
        
        // If there are pending queries, execute one
        if (state.pendingSubQueries.length > 0) {
          const query = state.pendingSubQueries[0];
          const results = await this.searchService.performSearch({ query });
          state = this.researchService.updateStateWithResults(state, query, results);
          continue;
        }
        
        // Get agent decision via LLM
        const decision = await this.agentService.makeDecision(state, this.llmAdapter);
        
        if (decision.action === 'search' && decision.query) {
          // Execute search
          const results = await this.searchService.performSearch({ query: decision.query });
          state = this.researchService.updateStateWithResults(state, decision.query, results);
        } 
        else if (decision.action === 'generate_subqueries') {
          // Generate new search queries
          const subQueries = await this.agentService.generateSubQueries(
            request.query,
            this.llmAdapter,
            request.depth
          );
          state = this.researchService.updateStateWithSubQueries(
            state,
            subQueries
          );
        }
        else if (decision.action === 'research_complete') {
          // Mark research as complete
          state.status = 'complete';
        }
      } catch (error) {
        console.error(`Error in research iteration ${iterationCount}:`, error);
        
        // If we have some results, proceed with synthesis despite the error
        if (state.searchResults.length > 0) {
          state.status = 'complete';
          break;
        } else {
          throw new McpError(
            ErrorCode.InternalError,
            `Research failed: ${(error as Error).message}`
          );
        }
      }
    }
    
    // If we hit max iterations, force completion
    if (state.status !== 'complete') {
      state.status = 'complete';
    }
    
    // Synthesize the final result
    return this.researchService.synthesizeResults(state, this.llmAdapter);
  }
  
  /**
   * Validates the research request
   */
  private validateRequest(request: ResearchRequest): void {
    if (!request.query || request.query.trim().length === 0) {
      throw new McpError(ErrorCode.InvalidParams, 'Query must be non-empty');
    }
    
    if (request.depth && !['basic', 'standard', 'deep'].includes(request.depth)) {
      throw new McpError(ErrorCode.InvalidParams, 'Depth must be one of: basic, standard, deep');
    }
    
    if (request.maxSources && (typeof request.maxSources !== 'number' || request.maxSources < 1)) {
      throw new McpError(ErrorCode.InvalidParams, 'maxSources must be a positive number');
    }
  }
  
  /**
   * Gets the maximum number of iterations based on research depth
   */
  private getMaxIterations(depth: 'basic' | 'standard' | 'deep'): number {
    return config.researchDepthSettings[depth].maxIterations;
  }
}
