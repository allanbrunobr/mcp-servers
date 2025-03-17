#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from 'zod-to-json-schema';
import { queryRAG } from './common/rag.js';

import { formatFlowiseError } from './common/errors.js';
import * as prediction from './operations/prediction.js';
import * as history from './operations/history.js';
import * as chatflow from './operations/chatflow.js';
import { z } from "zod";

const server = new Server(
  {
    name: "flowise-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "predict",
        description: "Send a question/input to Flowise and get a prediction/response",
        inputSchema: zodToJsonSchema(prediction.PredictionSchema),
      },
      {
        name: "get_chat_history",
        description: "Get chat history for a specific chatflow",
        inputSchema: zodToJsonSchema(history.ChatHistorySchema),
      },
      {
        name: "create_chatflow",
        description: "Create a new chatflow",
        inputSchema: zodToJsonSchema(chatflow.CreateChatflowSchema),
      },
      {
        name: "query_repo",
        description: "Query the Flowise repository for relevant information",
        inputSchema: zodToJsonSchema(z.object({
          question: z.string().describe('The question about the Flowise repository')
        })),
      },
      {
        name: "query_rag",
        description: "Query the Flowise codebase using RAG",
        inputSchema: zodToJsonSchema(z.object({
          question: z.string().describe('The question about Flowise')
        })),
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "predict": {
        const args = prediction.PredictionSchema.parse(request.params.arguments);
        const result = await prediction.predict(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_chat_history": {
        const args = history.ChatHistorySchema.parse(request.params.arguments);
        const result = await history.getChatHistory(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "create_chatflow": {
        const args = chatflow.CreateChatflowSchema.parse(request.params.arguments);
        const result = await chatflow.createChatflow(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "query_repo": {
        const { question } = z.object({
          question: z.string()
        }).parse(request.params.arguments);
        
        const results = await queryRAG(question);
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(results, null, 2) 
          }],
        };
      }

      case "query_rag": {
        const { question } = z.object({
          question: z.string()
        }).parse(request.params.arguments);
        
        const results = await queryRAG(question);
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify(results, null, 2) 
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    throw new Error(formatFlowiseError(error));
  }
});

// Error handling
server.onerror = (error) => console.error('[MCP Error]', error);
process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Flowise MCP Server running on stdio');
}

runServer().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
