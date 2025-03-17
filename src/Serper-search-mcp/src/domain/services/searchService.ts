/**
 * Core search service for Serper API operations
 */
import { SerperClient } from '../../infrastructure/api/serperClient.js';
import { SearchArgs, SerperResponse } from '../types/serper.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export class SearchService {
  private client: SerperClient;

  constructor(client: SerperClient) {
    this.client = client;
  }

  /**
   * Validates search arguments
   * @param args Search arguments to validate
   * @throws {McpError} when validation fails
   */
  validateSearchArgs(args: any): asserts args is SearchArgs {
    if (typeof args !== 'object' || args === null) {
      throw new McpError(ErrorCode.InvalidParams, 'Arguments must be an object');
    }

    if (typeof args.query !== 'string' || !args.query.trim()) {
      throw new McpError(ErrorCode.InvalidParams, 'Query must be a non-empty string');
    }

    if (args.numResults !== undefined && (
      typeof args.numResults !== 'number' ||
      args.numResults < 1 ||
      args.numResults > 100
    )) {
      throw new McpError(ErrorCode.InvalidParams, 'numResults must be between 1 and 100');
    }

    if (args.gl !== undefined && (
      typeof args.gl !== 'string' ||
      !/^[a-z]{2}$/.test(args.gl)
    )) {
      throw new McpError(ErrorCode.InvalidParams, 'gl (country) must be a valid 2-letter country code');
    }

    if (args.hl !== undefined && (
      typeof args.hl !== 'string' ||
      !/^[a-z]{2}(-[A-Z]{2})?$/.test(args.hl)
    )) {
      throw new McpError(ErrorCode.InvalidParams, 'hl (language) must be a valid language code');
    }

    if (args.autocorrect !== undefined && typeof args.autocorrect !== 'boolean') {
      throw new McpError(ErrorCode.InvalidParams, 'autocorrect must be a boolean');
    }
  }

  /**
   * Performs a search using the Serper API
   * @param args Search arguments
   * @returns Search results from Serper API
   */
  async performSearch(args: SearchArgs): Promise<SerperResponse> {
    return this.client.search(args);
  }
}
