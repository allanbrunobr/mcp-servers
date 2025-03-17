#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const LITELLM_HOST = process.env.LITELLM_HOST || 'http://localhost:4000';
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY;

if (!LITELLM_MASTER_KEY) {
  throw new Error('LITELLM_MASTER_KEY environment variable is required');
}

interface GenerateKeyResponse {
  key: string;
  expires: string;
  user_id: string;
}

interface KeyInfo {
  key: string;
  spend: number;
  models: string[];
  user: string;
  team_id: string;
}

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

class LiteLLMServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'litellm-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: LITELLM_HOST,
      headers: {
        'Authorization': `Bearer ${LITELLM_MASTER_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'generate_key',
          description: 'Generate a new virtual key for LiteLLM proxy',
          inputSchema: {
            type: 'object',
            properties: {
              models: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of allowed models for this key',
              },
              user_id: {
                type: 'string',
                description: 'User identifier for the key',
              },
              team_id: {
                type: 'string',
                description: 'Team identifier for the key',
              },
              duration: {
                type: 'string',
                description: 'Key expiration duration (e.g., "24h", "7d")',
              },
            },
            required: ['models', 'user_id'],
          },
        },
        {
          name: 'get_key_info',
          description: 'Get information about a virtual key',
          inputSchema: {
            type: 'object',
            properties: {
              key: {
                type: 'string',
                description: 'The virtual key to get information about',
              },
            },
            required: ['key'],
          },
        },
        {
          name: 'list_models',
          description: 'List available models in the LiteLLM proxy',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'proxy_completion',
          description: 'Make a completion request through the LiteLLM proxy',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'Model to use for completion',
              },
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'string',
                      enum: ['system', 'user', 'assistant'],
                    },
                    content: { type: 'string' },
                  },
                  required: ['role', 'content'],
                },
                description: 'Messages for the completion request',
              },
              key: {
                type: 'string',
                description: 'Virtual key to use for the request',
              },
            },
            required: ['model', 'messages', 'key'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!request.params.arguments) {
        throw new McpError(
          ErrorCode.InvalidParams,
          'Tool arguments are required'
        );
      }

      try {
        switch (request.params.name) {
          case 'generate_key': {
            const args = request.params.arguments as {
              models: string[];
              user_id: string;
              team_id?: string;
              duration?: string;
            };

            const response = await this.axiosInstance.post('/key/generate', {
              models: args.models,
              metadata: {
                user_id: args.user_id,
                team_id: args.team_id,
              },
              duration: args.duration,
            });

            const data: GenerateKeyResponse = response.data;
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    key: data.key,
                    expires: data.expires,
                    user_id: data.user_id,
                  }, null, 2),
                },
              ],
            };
          }

          case 'get_key_info': {
            const args = request.params.arguments as {
              key: string;
            };

            const response = await this.axiosInstance.get(`/key/info`, {
              params: { key: args.key },
            });

            const data: KeyInfo = response.data;
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            };
          }

          case 'list_models': {
            const response = await this.axiosInstance.get('/models');
            const models: ModelInfo[] = response.data.models;

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(models, null, 2),
                },
              ],
            };
          }

          case 'proxy_completion': {
            const args = request.params.arguments as {
              model: string;
              messages: Array<{
                role: 'system' | 'user' | 'assistant';
                content: string;
              }>;
              key: string;
            };

            const response = await this.axiosInstance.post(
              '/chat/completions',
              {
                model: args.model,
                messages: args.messages,
              },
              {
                headers: {
                  'Authorization': `Bearer ${args.key}`,
                },
              }
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(response.data, null, 2),
                },
              ],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        if (axios.isAxiosError(error)) {
          throw new McpError(
            ErrorCode.InternalError,
            `LiteLLM API error: ${error.response?.data?.message || error.message}`
          );
        }
        throw error;
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('LiteLLM MCP server running on stdio');
  }
}

const server = new LiteLLMServer();
server.run().catch(console.error);
