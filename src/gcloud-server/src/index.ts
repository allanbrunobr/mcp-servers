#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { Storage } from '@google-cloud/storage';
import { v1 } from '@google-cloud/compute';
import { BigQuery } from '@google-cloud/bigquery';
import { ImageAnnotatorClient } from '@google-cloud/vision';

const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;

if (!GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is required');
}

if (!PROJECT_ID) {
  throw new Error('GOOGLE_CLOUD_PROJECT environment variable is required');
}

class GoogleCloudServer {
  private server: Server;
  private storage: Storage;
  private computeClient: v1.InstancesClient;
  private bigquery: BigQuery;
  private vision: ImageAnnotatorClient;

  constructor() {
    this.server = new Server(
      {
        name: 'gcloud-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.storage = new Storage();
    this.computeClient = new v1.InstancesClient({
      keyFilename: GOOGLE_APPLICATION_CREDENTIALS
    });
    this.bigquery = new BigQuery();
    this.vision = new ImageAnnotatorClient();

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
          name: 'storage_list_files',
          description: 'List files in a Google Cloud Storage bucket',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: {
                type: 'string',
                description: 'Name of the bucket',
              },
              prefix: {
                type: 'string',
                description: 'Optional prefix to filter files',
              },
            },
            required: ['bucket'],
          },
        },
        {
          name: 'storage_upload_file',
          description: 'Upload a file to Google Cloud Storage',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: {
                type: 'string',
                description: 'Name of the bucket',
              },
              destination: {
                type: 'string',
                description: 'Destination path in the bucket',
              },
              content: {
                type: 'string',
                description: 'File content to upload',
              },
            },
            required: ['bucket', 'destination', 'content'],
          },
        },
        {
          name: 'compute_list_instances',
          description: 'List Compute Engine instances',
          inputSchema: {
            type: 'object',
            properties: {
              zone: {
                type: 'string',
                description: 'Zone name (e.g., us-central1-a)',
              },
            },
            required: ['zone'],
          },
        },
        {
          name: 'compute_start_instance',
          description: 'Start a Compute Engine instance',
          inputSchema: {
            type: 'object',
            properties: {
              zone: {
                type: 'string',
                description: 'Zone name (e.g., us-central1-a)',
              },
              instance: {
                type: 'string',
                description: 'Instance name',
              },
            },
            required: ['zone', 'instance'],
          },
        },
        {
          name: 'compute_stop_instance',
          description: 'Stop a Compute Engine instance',
          inputSchema: {
            type: 'object',
            properties: {
              zone: {
                type: 'string',
                description: 'Zone name (e.g., us-central1-a)',
              },
              instance: {
                type: 'string',
                description: 'Instance name',
              },
            },
            required: ['zone', 'instance'],
          },
        },
        {
          name: 'bigquery_query',
          description: 'Execute a BigQuery SQL query',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'SQL query to execute',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of results to return',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'vision_analyze_image',
          description: 'Analyze an image using Google Cloud Vision API',
          inputSchema: {
            type: 'object',
            properties: {
              imageUrl: {
                type: 'string',
                description: 'URL of the image to analyze',
              },
              features: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: [
                    'LABEL_DETECTION',
                    'TEXT_DETECTION',
                    'FACE_DETECTION',
                    'LANDMARK_DETECTION',
                    'LOGO_DETECTION',
                    'OBJECT_LOCALIZATION',
                  ],
                },
                description: 'List of features to detect',
              },
            },
            required: ['imageUrl', 'features'],
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
          case 'storage_list_files': {
            const args = request.params.arguments as {
              bucket: string;
              prefix?: string;
            };

            const [files] = await this.storage
              .bucket(args.bucket)
              .getFiles({ prefix: args.prefix });

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    files.map((file: any) => ({
                      name: file.name,
                      size: file.metadata.size,
                      updated: file.metadata.updated,
                    })),
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'storage_upload_file': {
            const args = request.params.arguments as {
              bucket: string;
              destination: string;
              content: string;
            };

            const file = this.storage.bucket(args.bucket).file(args.destination);
            await file.save(args.content);

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    message: 'File uploaded successfully',
                    path: `gs://${args.bucket}/${args.destination}`,
                  }, null, 2),
                },
              ],
            };
          }

          case 'compute_list_instances': {
            const args = request.params.arguments as {
              zone: string;
            };

            const [instances] = await this.computeClient.list({
              project: PROJECT_ID,
              zone: args.zone,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    instances.map((instance: any) => ({
                      id: instance.id,
                      name: instance.name,
                      status: instance.metadata.status,
                      machineType: instance.metadata.machineType,
                    })),
                    null,
                    2
                  ),
                },
              ],
            };
          }

          case 'compute_start_instance': {
            const args = request.params.arguments as {
              zone: string;
              instance: string;
            };

            const [operation] = await this.computeClient.start({
              project: PROJECT_ID,
              zone: args.zone,
              instance: args.instance,
            });
            await operation.promise();

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    message: 'Instance started successfully',
                    instance: args.instance,
                    zone: args.zone,
                  }, null, 2),
                },
              ],
            };
          }

          case 'compute_stop_instance': {
            const args = request.params.arguments as {
              zone: string;
              instance: string;
            };

            const [operation] = await this.computeClient.stop({
              project: PROJECT_ID,
              zone: args.zone,
              instance: args.instance,
            });
            await operation.promise();

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    message: 'Instance stopped successfully',
                    instance: args.instance,
                    zone: args.zone,
                  }, null, 2),
                },
              ],
            };
          }

          case 'bigquery_query': {
            const args = request.params.arguments as {
              query: string;
              maxResults?: number;
            };

            const options = args.maxResults
              ? { query: args.query, maxResults: args.maxResults }
              : { query: args.query };

            const [job] = await this.bigquery.createQueryJob(options);
            const [rows] = await job.getQueryResults();

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(rows, null, 2),
                },
              ],
            };
          }

          case 'vision_analyze_image': {
            const args = request.params.arguments as {
              imageUrl: string;
              features: string[];
            };

            const visionRequest = {
              image: { source: { imageUri: args.imageUrl } },
              features: args.features.map(feature => ({ type: feature })),
            };

            const [result] = await this.vision.annotateImage(visionRequest);

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(result, null, 2),
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
        throw new McpError(
          ErrorCode.InternalError,
          `Google Cloud API error: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Cloud MCP server running on stdio');
  }
}

const server = new GoogleCloudServer();
server.run().catch(console.error);
