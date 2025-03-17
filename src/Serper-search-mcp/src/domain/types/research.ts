/**
 * Type definitions for deep research functionality
 */
import { SerperResponse } from './serper.js';

/**
 * Main research request with query and optional parameters
 */
export interface ResearchRequest {
  query: string;
  depth?: 'basic' | 'standard' | 'deep';
  maxSources?: number;
}

/**
 * Internal state of the research process
 */
export interface ResearchState {
  originalQuery: string;
  subQueries: SubQuery[];
  searchResults: SearchResult[];
  completedSubQueries: string[];
  pendingSubQueries: string[];
  synthesizedResults?: string;
  citations: Citation[];
  status: 'in_progress' | 'complete';
}

/**
 * Represents a decomposed query for focused research
 */
export interface SubQuery {
  id: string;
  query: string;
  rationale: string;
  status: 'pending' | 'completed' | 'failed';
}

/**
 * Results from a search operation
 */
export interface SearchResult {
  query: string;
  results: SerperResponse;
  timestamp: number;
}

/**
 * Citation information for a source
 */
export interface Citation {
  id: string;
  title: string;
  url: string;
  snippet: string;
  relevanceScore: number;
}

/**
 * Final research result format
 */
export interface ResearchResult {
  answer: string;
  citations: Citation[];
  subQueriesGenerated: number;
  subQueriesCompleted: number;
  searchesPerformed: number;
}

/**
 * Agent decision returned by the LLM
 */
export interface AgentDecision {
  action: 'search' | 'generate_subqueries' | 'research_complete';
  query?: string;
  rationale: string;
}
