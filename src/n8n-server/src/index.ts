#!/usr/bin/env node
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ErrorCode,
    ListToolsRequestSchema,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios from 'axios';

// Add some debug logging
console.error('API_KEY:', !!process.env.N8N_API_KEY);
console.error('API_URL:', process.env.N8N_API_URL);

const API_KEY = process.env.N8N_API_KEY;
const API_URL = process.env.N8N_API_URL;

if (!API_KEY || !API_URL) {
    throw new Error('N8N_API_KEY and N8N_API_URL environment variables are required. Please check your .env file.');
}

const server = new Server(
    {
        name: 'n8n-server',
        version: '0.1.0',
    },
    {
        capabilities: {
            resources: {},
            tools: {},
        },
    }
);

const axiosInstance = axios.create({
    baseURL: API_URL + '/api/v1',
    headers: {
        'X-N8N-API-KEY': API_KEY,
    },
    maxRedirects: 5,
});

async function listWorkflows() {
    try {
        const response = await axiosInstance.get('/workflows');
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(response.data, null, 2),
                },
            ],
        };
    } catch (error: any) {
        return handleAxiosError(error);
    }
}

async function getWorkflow(args: { id: string }) {
    try {
        const response = await axiosInstance.get(`/workflows/${args.id}`);
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify(response.data, null, 2),
                },
            ],
        };
    } catch (error: any) {
        return handleAxiosError(error);
    }
}

function handleAxiosError(error: any) {
    if (axios.isAxiosError(error)) {
        return {
            content: [
                {
                    type: 'text',
                    text: `n8n API error: ${error.response?.data.message ?? error.message}`,
                },
            ],
            isError: true,
        };
    }
    throw error;
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'list_workflows',
            description: 'List available workflows',
            inputSchema: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
        {
            name: 'get_workflow',
            description: 'Get details of a specific workflow',
            inputSchema: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'Workflow ID',
                    },
                },
                required: ['id'],
            },
        },
    ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    switch (request.params.name) {
        case 'list_workflows':
            return listWorkflows();
        case 'get_workflow':
            return getWorkflow(request.params.arguments);
        default:
            throw new McpError(
                ErrorCode.MethodNotFound,
                `Unknown tool: ${request.params.name}`
            );
    }
});

server.onerror = (error: Error) => console.error('[MCP Error]', error);
process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
});

async function runServer() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('N8N MCP Server running on stdio');
}

runServer().catch((error: Error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
