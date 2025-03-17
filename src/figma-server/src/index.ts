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

const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
if (!FIGMA_ACCESS_TOKEN) {
    throw new Error('FIGMA_ACCESS_TOKEN environment variable is required');
}

class FigmaServer {
    private server: Server;
    private axiosInstance;

    constructor() {
        this.server = new Server(
            {
                name: 'figma-server',
                version: '0.1.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );

        this.axiosInstance = axios.create({
            baseURL: 'https://api.figma.com/v1',
            headers: {
                'X-Figma-Token': FIGMA_ACCESS_TOKEN,
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
                    name: 'list_files',
                    description: 'List all files in your Figma account',
                    inputSchema: {
                        type: 'object',
                        properties: {},
                        required: [],
                    },
                },
                {
                    name: 'get_file',
                    description: 'Get details of a specific Figma file',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            fileKey: {
                                type: 'string',
                                description: 'The file key (can be found in the Figma file URL)',
                            },
                        },
                        required: ['fileKey'],
                    },
                },
                {
                    name: 'export_frame',
                    description: 'Export a frame or component as PNG',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            fileKey: {
                                type: 'string',
                                description: 'The file key',
                            },
                            nodeId: {
                                type: 'string',
                                description: 'The node ID of the frame/component to export',
                            },
                        },
                        required: ['fileKey', 'nodeId'],
                    },
                },
            ],
        }));

        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            try {
                switch (request.params.name) {
                    case 'list_files': {
                        const response = await this.axiosInstance.get('/files');
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(response.data, null, 2),
                                },
                            ],
                        };
                    }

                    case 'get_file': {
                        const { fileKey } = request.params.arguments as { fileKey: string };
                        const response = await this.axiosInstance.get(`/files/${fileKey}`);
                        return {
                            content: [
                                {
                                    type: 'text',
                                    text: JSON.stringify(response.data, null, 2),
                                },
                            ],
                        };
                    }

                    case 'export_frame': {
                        const { fileKey, nodeId } = request.params.arguments as {
                            fileKey: string;
                            nodeId: string;
                        };
                        const response = await this.axiosInstance.get(
                            `/images/${fileKey}?ids=${nodeId}&format=png`
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
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Figma API error: ${error.response?.data?.message ?? error.message
                                    }`,
                            },
                        ],
                        isError: true,
                    };
                }
                throw error;
            }
        });
    }

    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Figma MCP server running on stdio');
    }
}

const server = new FigmaServer();
server.run().catch(console.error);
