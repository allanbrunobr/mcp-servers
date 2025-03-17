/**
 * Serper API client configuration and request handling
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import { config, REQUEST_TIMEOUT, RATE_LIMIT, RATE_WINDOW } from '../config/environment.js';
import { SearchArgs, SerperResponse } from '../../domain/types/serper.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';

export class SerperClient {
  private axiosInstance: AxiosInstance;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: config.serperApiUrl,
      headers: {
        'X-API-KEY': config.serperApiKey,
      },
      timeout: REQUEST_TIMEOUT,
    });
  }

  /**
   * Ensures the rate limit is not exceeded
   * @throws {McpError} when rate limit is exceeded
   */
  private checkRateLimit(): void {
    const now = Date.now();
    if (now - this.lastRequestTime >= RATE_WINDOW) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }

    if (this.requestCount >= RATE_LIMIT) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Rate limit of ${RATE_LIMIT} requests per minute exceeded`
      );
    }

    this.requestCount++;
  }

  /**
   * Performs a search request to the Serper API
   * @param args Search arguments
   * @returns Search response from Serper API
   * @throws {McpError} for API errors and rate limit issues
   */
  async search(args: SearchArgs): Promise<SerperResponse> {
    try {
      this.checkRateLimit();

      const { query, numResults = 10, gl, hl, autocorrect } = args;

      const response = await this.axiosInstance.post<SerperResponse>('/search', {
        q: query,
        num: numResults,
        gl,
        hl,
        autocorrect,
      });

      return response.data;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw new McpError(
          ErrorCode.InternalError,
          `SERPER API error: ${
            (axiosError.response?.data as { message?: string })?.message ?? axiosError.message
          }`
        );
      }

      throw new McpError(
        ErrorCode.InternalError,
        `Unexpected error: ${(error as Error).message}`
      );
    }
  }
}
