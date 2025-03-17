/**
 * Type definitions for Serper API requests and responses
 */

// Search parameters for the Serper API
export interface SearchParameters {
  q: string;
  gl?: string;
  hl?: string;
  autocorrect?: boolean;
  page?: number;
  type: 'search';
}

// Knowledge graph information in search results
export interface KnowledgeGraph {
  title: string;
  type: string;
  website?: string;
  imageUrl?: string;
  description?: string;
  descriptionSource?: string;
  descriptionLink?: string;
  attributes: Record<string, string>;
}

// Sitelinks that may appear under organic results
export interface Sitelink {
  title: string;
  link: string;
}

// Organic search result entry
export interface OrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
  sitelinks?: Sitelink[];
  attributes?: Record<string, string>;
  date?: string;
}

// "People also ask" questions and answers
export interface PeopleAlsoAskItem {
  question: string;
  snippet: string;
  title?: string;
  link: string;
}

// Related search suggestions
export interface RelatedSearch {
  query: string;
}

// Complete Serper API response structure
export interface SerperResponse {
  searchParameters: SearchParameters;
  knowledgeGraph?: KnowledgeGraph;
  organic: OrganicResult[];
  peopleAlsoAsk?: PeopleAlsoAskItem[];
  relatedSearches?: RelatedSearch[];
}

// Arguments for the MCP search tool
export interface SearchArgs {
  query: string;
  numResults?: number;
  gl?: string;
  hl?: string;
  autocorrect?: boolean;
}
