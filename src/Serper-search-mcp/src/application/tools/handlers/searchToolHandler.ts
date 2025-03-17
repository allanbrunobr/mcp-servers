/**
 * Handler implementation for the Serper Google search tool
 */
import { SearchService } from '../../../domain/services/searchService.js';
import { SearchArgs } from '../../../domain/types/serper.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

export class SearchToolHandler {
  private searchService: SearchService;

  constructor(searchService: SearchService) {
    this.searchService = searchService;
  }

  /**
   * Handles the search tool request
   * @param args Tool input arguments
   * @returns Formatted tool response
   */
  async handleSearchRequest(args: any) {
    try {
      // Validate input arguments
      this.searchService.validateSearchArgs(args);
      
      // Perform the search
      const searchResults = await this.searchService.performSearch(args as SearchArgs);
      
      // Return formatted results
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(searchResults, null, 2),
          },
        ],
      };
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      
      // Handle unexpected errors
      throw new McpError(
        ErrorCode.InternalError,
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }
}
