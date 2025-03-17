/**
 * OpenRouter implementation of the LLM adapter
 */
import { 
  OpenRouterClient, 
  ChatMessage, 
  CompletionOptions, 
  ChatCompletionOptions, 
  ChatResponse 
} from '../../infrastructure/api/openRouterClient.js';
import { LLMAdapter } from './llmAdapter.js';

/**
 * Adapter for OpenRouter LLM API access
 */
export class OpenRouterAdapter implements LLMAdapter {
  private client: OpenRouterClient;
  
  /**
   * Creates a new OpenRouter adapter
   */
  constructor(client: OpenRouterClient) {
    this.client = client;
  }
  
  /**
   * Generates a completion using OpenRouter
   */
  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<string> {
    return this.client.completion(prompt, options);
  }
  
  /**
   * Generates a chat completion using OpenRouter
   */
  async generateChatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatResponse> {
    return this.client.chatCompletion(messages, options);
  }
}
