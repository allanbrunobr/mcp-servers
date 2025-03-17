/**
 * Interface for LLM adapters
 */
import { 
  ChatMessage, 
  CompletionOptions, 
  ChatCompletionOptions, 
  ChatResponse 
} from '../../infrastructure/api/openRouterClient.js';

/**
 * Interface for adapters that provide LLM capabilities
 */
export interface LLMAdapter {
  /**
   * Generates a completion from a prompt
   */
  generateCompletion(prompt: string, options?: CompletionOptions): Promise<string>;
  
  /**
   * Generates a chat completion from a sequence of messages
   */
  generateChatCompletion(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatResponse>;
}
