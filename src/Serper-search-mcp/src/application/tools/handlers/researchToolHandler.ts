/**
 * Handler implementation for the Deep Research tool
 */
import { ResearchOrchestrator } from '../../orchestration/researchOrchestrator.js';
import { ResearchRequest, ResearchResult } from '../../../domain/types/research.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

/**
 * Handles requests to the deep-research tool
 */
export class ResearchToolHandler {
  private researchOrchestrator: ResearchOrchestrator;

  /**
   * Creates a new research tool handler
   */
  constructor(researchOrchestrator: ResearchOrchestrator) {
    this.researchOrchestrator = researchOrchestrator;
  }

  /**
   * Handles the research tool request
   * @param args Tool input arguments
   * @returns Formatted tool response
   */
  async handleResearchRequest(args: any) {
    try {
      // Validate and create research request
      const request: ResearchRequest = {
        query: args.query,
        depth: args.depth || 'standard',
        maxSources: args.maxSources || 10
      };
      
      console.log(`Deep Research request: ${JSON.stringify(request)}`);
      
      // Execute the research process
      const result = await this.researchOrchestrator.executeResearch(request);
      
      // Return formatted results
      return {
        content: [
          {
            type: 'text',
            text: this.formatResearchResult(result),
          },
        ],
      };
    } catch (error) {
      console.error('Error in research tool handler:', error);
      
      if (error instanceof McpError) {
        throw error;
      }
      
      // Handle unexpected errors
      throw new McpError(
        ErrorCode.InternalError,
        `Unexpected error during research: ${(error as Error).message}`
      );
    }
  }

  /**
   * Formats the research result as markdown with citations
   */
  private formatResearchResult(result: ResearchResult): string {
    // Start with the main answer
    let formattedResult = result.answer;

    // Add statistics section if not already included
    if (!formattedResult.includes('## Research Statistics')) {
      formattedResult += `\n\n## Research Statistics\n`;
      formattedResult += `- Queries Generated: ${result.subQueriesGenerated}\n`;
      formattedResult += `- Searches Performed: ${result.searchesPerformed}\n`;
      formattedResult += `- Sources Cited: ${result.citations.length}\n`;
    }

    // Add sources section if not already included
    if (!formattedResult.includes('## Sources')) {
      formattedResult += `\n\n## Sources\n\n`;
      
      // Add sources with numbers matching citations in the text
      result.citations.forEach((citation, index) => {
        formattedResult += `[${index + 1}] ${citation.title}\n`;
        formattedResult += `    URL: ${citation.url}\n\n`;
      });
    }

    return formattedResult;
  }
}
