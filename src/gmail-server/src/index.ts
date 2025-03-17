#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';
import { join } from 'path';
import { promises as fs } from 'fs';
import { OAuth2Client } from 'google-auth-library';

// Get paths from environment variables or use default paths
const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH || join(process.cwd(), 'credentials.json');
const TOKEN_PATH = process.env.TOKEN_PATH || join(process.cwd(), 'token.json');
const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

class GmailServer {
  private server: Server;
  private auth: OAuth2Client | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'gmail-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async loadSavedCredentialsIfExist(): Promise<OAuth2Client | null> {
    try {
      const content = await fs.readFile(TOKEN_PATH);
      const credentials = JSON.parse(content.toString());
      return google.auth.fromJSON(credentials) as OAuth2Client;
    } catch (err) {
      return null;
    }
  }

  private async saveCredentials(client: OAuth2Client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content.toString());
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
  }

  private async authorize(): Promise<OAuth2Client> {
    try {
      let client = await this.loadSavedCredentialsIfExist();
      if (client) {
        return client;
      }
      client = await authenticate({
        scopes: SCOPES,
        keyfilePath: CREDENTIALS_PATH,
      });
      if (client?.credentials) {
        await this.saveCredentials(client);
      }
      return client;
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        'Falha na autenticação com o Gmail'
      );
    }
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_emails',
          description: 'Lista os emails mais recentes da caixa de entrada',
          inputSchema: {
            type: 'object',
            properties: {
              maxResults: {
                type: 'number',
                description: 'Número máximo de emails para listar',
                default: 10,
              },
            },
          },
        },
        {
          name: 'search_emails',
          description: 'Pesquisa emails usando uma query',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Query de pesquisa (sintaxe do Gmail)',
              },
              maxResults: {
                type: 'number',
                description: 'Número máximo de resultados',
                default: 10,
              },
            },
            required: ['query'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!this.auth) {
        try {
          this.auth = await this.authorize();
        } catch (error) {
          throw new McpError(
            ErrorCode.InternalError,
            'Falha na autenticação com o Gmail'
          );
        }
      }

      const gmail = google.gmail({ version: 'v1', auth: this.auth });

      switch (request.params.name) {
        case 'list_emails': {
          const { maxResults = 10 } = request.params.arguments as any;
          try {
            const response = await gmail.users.messages.list({
              userId: 'me',
              maxResults,
            });

            const emails = await Promise.all(
              response.data.messages?.map(async (message) => {
                const email = await gmail.users.messages.get({
                  userId: 'me',
                  id: message.id!,
                });
                return {
                  id: email.data.id,
                  subject: email.data.payload?.headers?.find(
                    (h) => h.name === 'Subject'
                  )?.value,
                  from: email.data.payload?.headers?.find(
                    (h) => h.name === 'From'
                  )?.value,
                  date: email.data.payload?.headers?.find(
                    (h) => h.name === 'Date'
                  )?.value,
                };
              }) || []
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(emails, null, 2),
                },
              ],
            };
          } catch (error: any) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Erro ao listar emails: ${error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        case 'search_emails': {
          const { query, maxResults = 10 } = request.params.arguments as any;
          try {
            const response = await gmail.users.messages.list({
              userId: 'me',
              q: query,
              maxResults,
            });

            const emails = await Promise.all(
              response.data.messages?.map(async (message) => {
                const email = await gmail.users.messages.get({
                  userId: 'me',
                  id: message.id!,
                });
                return {
                  id: email.data.id,
                  subject: email.data.payload?.headers?.find(
                    (h) => h.name === 'Subject'
                  )?.value,
                  from: email.data.payload?.headers?.find(
                    (h) => h.name === 'From'
                  )?.value,
                  date: email.data.payload?.headers?.find(
                    (h) => h.name === 'Date'
                  )?.value,
                };
              }) || []
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(emails, null, 2),
                },
              ],
            };
          } catch (error: any) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Erro na pesquisa de emails: ${error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Ferramenta desconhecida: ${request.params.name}`
          );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Gmail MCP server running on stdio');
  }
}

const server = new GmailServer();
server.run().catch(console.error);
