#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE || '';

if (!SUPABASE_URL || !SUPABASE_KEY || !SUPABASE_SERVICE_ROLE) {
  throw new Error('Required Supabase environment variables are missing');
}

// Type definitions and validators
interface BaseArgs {
  [key: string]: unknown;
  useServiceRole?: boolean;
}

interface CreateTableArgs extends BaseArgs {
  name: string;
  columns: Array<{
    name: string;
    type: string;
    isNullable?: boolean;
    defaultValue?: string;
    isPrimaryKey?: boolean;
    isUnique?: boolean;
    references?: {
      table: string;
      column: string;
      onDelete?: 'CASCADE' | 'RESTRICT' | 'SET NULL';
    };
  }>;
  enableRls?: boolean;
}

const isCreateTableArgs = (args: Record<string, unknown>): args is CreateTableArgs => {
  return (
    typeof args.name === 'string' &&
    Array.isArray(args.columns) &&
    args.columns.every(col => 
      typeof col === 'object' &&
      col !== null &&
      typeof col.name === 'string' &&
      typeof col.type === 'string'
    )
  );
};

interface AlterTableArgs extends BaseArgs {
  name: string;
  changes: Array<{
    type: 'ADD_COLUMN' | 'DROP_COLUMN' | 'ALTER_COLUMN' | 'RENAME_COLUMN';
    column: string;
    newName?: string;
    dataType?: string;
    isNullable?: boolean;
    defaultValue?: string;
  }>;
}

const isAlterTableArgs = (args: Record<string, unknown>): args is AlterTableArgs => {
  return (
    typeof args.name === 'string' &&
    Array.isArray(args.changes) &&
    args.changes.every(change =>
      typeof change === 'object' &&
      change !== null &&
      typeof change.type === 'string' &&
      typeof change.column === 'string'
    )
  );
};

interface CreatePolicyArgs extends BaseArgs {
  table: string;
  name: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL';
  definition: string;
  check?: string;
  roles?: string[];
}

const isCreatePolicyArgs = (args: Record<string, unknown>): args is CreatePolicyArgs => {
  return (
    typeof args.table === 'string' &&
    typeof args.name === 'string' &&
    typeof args.operation === 'string' &&
    typeof args.definition === 'string'
  );
};

interface UpdatePolicyArgs extends BaseArgs {
  table: string;
  name: string;
  newDefinition?: string;
  newCheck?: string;
  newRoles?: string[];
}

const isUpdatePolicyArgs = (args: Record<string, unknown>): args is UpdatePolicyArgs => {
  return (
    typeof args.table === 'string' &&
    typeof args.name === 'string'
  );
};

interface DeletePolicyArgs extends BaseArgs {
  table: string;
  name: string;
}

const isDeletePolicyArgs = (args: Record<string, unknown>): args is DeletePolicyArgs => {
  return (
    typeof args.table === 'string' &&
    typeof args.name === 'string'
  );
};

interface ToggleRlsArgs extends BaseArgs {
  table: string;
  enable: boolean;
}

const isToggleRlsArgs = (args: Record<string, unknown>): args is ToggleRlsArgs => {
  return (
    typeof args.table === 'string' &&
    typeof args.enable === 'boolean'
  );
};

interface QueryDataArgs extends BaseArgs {
  table: string;
  select: string;
  filters?: Record<string, unknown>;
}

const isQueryDataArgs = (args: Record<string, unknown>): args is QueryDataArgs => {
  return typeof args.table === 'string' && typeof args.select === 'string';
};

interface InsertDataArgs extends BaseArgs {
  table: string;
  data: Record<string, unknown>;
}

const isInsertDataArgs = (args: Record<string, unknown>): args is InsertDataArgs => {
  return typeof args.table === 'string' && typeof args.data === 'object' && args.data !== null;
};

interface UpdateDataArgs extends BaseArgs {
  table: string;
  data: Record<string, unknown>;
  filters: Record<string, unknown>;
}

const isUpdateDataArgs = (args: Record<string, unknown>): args is UpdateDataArgs => {
  return (
    typeof args.table === 'string' &&
    typeof args.data === 'object' &&
    args.data !== null &&
    typeof args.filters === 'object' &&
    args.filters !== null
  );
};

interface DeleteDataArgs extends BaseArgs {
  table: string;
  filters: Record<string, unknown>;
}

const isDeleteDataArgs = (args: Record<string, unknown>): args is DeleteDataArgs => {
  return (
    typeof args.table === 'string' &&
    typeof args.filters === 'object' &&
    args.filters !== null
  );
};

interface UploadFileArgs extends BaseArgs {
  bucket: string;
  path: string;
  data: string;
  contentType: string;
}

const isUploadFileArgs = (args: Record<string, unknown>): args is UploadFileArgs => {
  return (
    typeof args.bucket === 'string' &&
    typeof args.path === 'string' &&
    typeof args.data === 'string' &&
    typeof args.contentType === 'string'
  );
};

class SupabaseServer {
  private server: Server;
  private supabase;
  private supabaseAdmin;

  constructor() {
    this.server = new Server(
      {
        name: 'supabase-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize Supabase clients
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    this.setupToolHandlers();
    
    // Error handling
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
          name: 'create_table',
          description: 'Create a new table in the database',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the table to create',
              },
              columns: {
                type: 'array',
                description: 'Column definitions',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Column name',
                    },
                    type: {
                      type: 'string',
                      description: 'Column data type',
                    },
                    isNullable: {
                      type: 'boolean',
                      description: 'Whether the column can be null',
                    },
                    defaultValue: {
                      type: 'string',
                      description: 'Default value for the column',
                    },
                    isPrimaryKey: {
                      type: 'boolean',
                      description: 'Whether this column is a primary key',
                    },
                    isUnique: {
                      type: 'boolean',
                      description: 'Whether this column should have a unique constraint',
                    },
                    references: {
                      type: 'object',
                      description: 'Foreign key reference',
                      properties: {
                        table: {
                          type: 'string',
                          description: 'Referenced table',
                        },
                        column: {
                          type: 'string',
                          description: 'Referenced column',
                        },
                        onDelete: {
                          type: 'string',
                          enum: ['CASCADE', 'RESTRICT', 'SET NULL'],
                          description: 'On delete behavior',
                        },
                      },
                      required: ['table', 'column'],
                    },
                  },
                  required: ['name', 'type'],
                },
              },
              enableRls: {
                type: 'boolean',
                description: 'Enable Row Level Security for the table',
                default: true,
              },
              useServiceRole: {
                type: 'boolean',
                description: 'Whether to use service role for admin access',
                default: true,
              },
            },
            required: ['name', 'columns'],
          },
        },
        {
          name: 'alter_table',
          description: 'Alter an existing table structure',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Name of the table to alter',
              },
              changes: {
                type: 'array',
                description: 'List of changes to apply',
                items: {
                  type: 'object',
                  properties: {
                    type: {
                      type: 'string',
                      enum: ['ADD_COLUMN', 'DROP_COLUMN', 'ALTER_COLUMN', 'RENAME_COLUMN'],
                      description: 'Type of change',
                    },
                    column: {
                      type: 'string',
                      description: 'Column name',
                    },
                    newName: {
                      type: 'string',
                      description: 'New column name (for RENAME_COLUMN)',
                    },
                    dataType: {
                      type: 'string',
                      description: 'New data type (for ALTER_COLUMN)',
                    },
                    isNullable: {
                      type: 'boolean',
                      description: 'Whether the column can be null (for ALTER_COLUMN)',
                    },
                    defaultValue: {
                      type: 'string',
                      description: 'Default value (for ALTER_COLUMN)',
                    },
                  },
                  required: ['type', 'column'],
                },
              },
              useServiceRole: {
                type: 'boolean',
                description: 'Whether to use service role for admin access',
                default: true,
              },
            },
            required: ['name', 'changes'],
          },
        },
        {
          name: 'create_policy',
          description: 'Create a new Row Level Security policy',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Table name',
              },
              name: {
                type: 'string',
                description: 'Policy name',
              },
              operation: {
                type: 'string',
                enum: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'ALL'],
                description: 'Operation this policy applies to',
              },
              definition: {
                type: 'string',
                description: 'USING expression for the policy',
              },
              check: {
                type: 'string',
                description: 'WITH CHECK expression for INSERT/UPDATE policies',
              },
              roles: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'Roles this policy applies to',
              },
              useServiceRole: {
                type: 'boolean',
                description: 'Whether to use service role for admin access',
                default: true,
              },
            },
            required: ['table', 'name', 'operation', 'definition'],
          },
        },
        {
          name: 'update_policy',
          description: 'Update an existing Row Level Security policy',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Table name',
              },
              name: {
                type: 'string',
                description: 'Policy name',
              },
              newDefinition: {
                type: 'string',
                description: 'New USING expression',
              },
              newCheck: {
                type: 'string',
                description: 'New WITH CHECK expression',
              },
              newRoles: {
                type: 'array',
                items: {
                  type: 'string',
                },
                description: 'New roles this policy applies to',
              },
              useServiceRole: {
                type: 'boolean',
                description: 'Whether to use service role for admin access',
                default: true,
              },
            },
            required: ['table', 'name'],
          },
        },
        {
          name: 'delete_policy',
          description: 'Delete a Row Level Security policy',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Table name',
              },
              name: {
                type: 'string',
                description: 'Policy name',
              },
              useServiceRole: {
                type: 'boolean',
                description: 'Whether to use service role for admin access',
                default: true,
              },
            },
            required: ['table', 'name'],
          },
        },
        {
          name: 'toggle_rls',
          description: 'Enable or disable Row Level Security for a table',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Table name',
              },
              enable: {
                type: 'boolean',
                description: 'Whether to enable or disable RLS',
              },
              useServiceRole: {
                type: 'boolean',
                description: 'Whether to use service role for admin access',
                default: true,
              },
            },
            required: ['table', 'enable'],
          },
        },
        {
          name: 'query_data',
          description: 'Execute a query on a Supabase table',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Name of the table to query',
              },
              select: {
                type: 'string',
                description: 'Columns to select (*, specific columns)',
              },
              filters: {
                type: 'object',
                description: 'Query filters to apply',
                additionalProperties: true,
              },
              useServiceRole: {
                type: 'boolean',
                description: 'Whether to use service role for admin access',
                default: false,
              },
            },
            required: ['table', 'select'],
          },
        },
        {
          name: 'insert_data',
          description: 'Insert data into a Supabase table',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Name of the table',
              },
              data: {
                type: 'object',
                description: 'Data to insert',
                additionalProperties: true,
              },
              useServiceRole: {
                type: 'boolean',
                description: 'Whether to use service role for admin access',
                default: false,
              },
            },
            required: ['table', 'data'],
          },
        },
        {
          name: 'update_data',
          description: 'Update data in a Supabase table',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Name of the table',
              },
              data: {
                type: 'object',
                description: 'Data to update',
                additionalProperties: true,
              },
              filters: {
                type: 'object',
                description: 'Update filters',
                additionalProperties: true,
              },
              useServiceRole: {
                type: 'boolean',
                description: 'Whether to use service role for admin access',
                default: false,
              },
            },
            required: ['table', 'data', 'filters'],
          },
        },
        {
          name: 'delete_data',
          description: 'Delete data from a Supabase table',
          inputSchema: {
            type: 'object',
            properties: {
              table: {
                type: 'string',
                description: 'Name of the table',
              },
              filters: {
                type: 'object',
                description: 'Delete filters',
                additionalProperties: true,
              },
              useServiceRole: {
                type: 'boolean',
                description: 'Whether to use service role for admin access',
                default: false,
              },
            },
            required: ['table', 'filters'],
          },
        },
        {
          name: 'list_tables',
          description: 'List all tables in the database',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
        {
          name: 'upload_file',
          description: 'Upload a file to Supabase Storage',
          inputSchema: {
            type: 'object',
            properties: {
              bucket: {
                type: 'string',
                description: 'Storage bucket name',
              },
              path: {
                type: 'string',
                description: 'File path in the bucket',
              },
              data: {
                type: 'string',
                description: 'Base64 encoded file data',
              },
              contentType: {
                type: 'string',
                description: 'File content type',
              },
            },
            required: ['bucket', 'path', 'data', 'contentType'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (!request.params.arguments) {
        throw new McpError(ErrorCode.InvalidParams, 'Arguments are required');
      }

      const client = request.params.arguments.useServiceRole ? this.supabaseAdmin : this.supabase;

      try {
        switch (request.params.name) {
          case 'create_table': {
            if (!isCreateTableArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid create table arguments');
            }
            const { name, columns, enableRls = true } = request.params.arguments;

            // Build CREATE TABLE SQL
            const columnDefs = columns.map(col => {
              let def = `"${col.name}" ${col.type}`;
              if (col.isPrimaryKey) def += ' PRIMARY KEY';
              if (col.isUnique) def += ' UNIQUE';
              if (col.isNullable === false) def += ' NOT NULL';
              if (col.defaultValue) def += ` DEFAULT ${col.defaultValue}`;
              if (col.references) {
                def += ` REFERENCES "${col.references.table}"("${col.references.column}")`;
                if (col.references.onDelete) def += ` ON DELETE ${col.references.onDelete}`;
              }
              return def;
            }).join(', ');

            const createTableSql = `
              CREATE TABLE "${name}" (${columnDefs});
              ${enableRls ? `ALTER TABLE "${name}" ENABLE ROW LEVEL SECURITY;` : ''}
            `;

            const result = await this.supabaseAdmin.rpc('exec_sql', { sql: createTableSql });
            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: `Table "${name}" created successfully` }],
            };
          }

          case 'alter_table': {
            if (!isAlterTableArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid alter table arguments');
            }
            const { name, changes } = request.params.arguments;

            // Build ALTER TABLE SQL
            const alterStatements = changes.map(change => {
              switch (change.type) {
                case 'ADD_COLUMN':
                  return `ALTER TABLE "${name}" ADD COLUMN "${change.column}" ${change.dataType}${
                    change.isNullable === false ? ' NOT NULL' : ''
                  }${change.defaultValue ? ` DEFAULT ${change.defaultValue}` : ''}`;
                case 'DROP_COLUMN':
                  return `ALTER TABLE "${name}" DROP COLUMN "${change.column}"`;
                case 'ALTER_COLUMN':
                  return `ALTER TABLE "${name}" ALTER COLUMN "${change.column}"${
                    change.dataType ? ` TYPE ${change.dataType}` : ''
                  }${change.isNullable === false ? ' SET NOT NULL' : ''}${
                    change.defaultValue ? ` SET DEFAULT ${change.defaultValue}` : ''
                  }`;
                case 'RENAME_COLUMN':
                  return `ALTER TABLE "${name}" RENAME COLUMN "${change.column}" TO "${change.newName}"`;
                default:
                  throw new McpError(ErrorCode.InvalidParams, `Unknown change type: ${change.type}`);
              }
            }).join(';\n');

            const result = await this.supabaseAdmin.rpc('exec_sql', { sql: alterStatements });
            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: `Table "${name}" altered successfully` }],
            };
          }

          case 'create_policy': {
            if (!isCreatePolicyArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid create policy arguments');
            }
            const { table, name, operation, definition, check, roles } = request.params.arguments;

            let createPolicySql = `
              CREATE POLICY "${name}" ON "${table}"
              FOR ${operation}
              ${roles ? `TO ${roles.map(r => `"${r}"`).join(', ')}` : ''}
              USING (${definition})
              ${check ? `WITH CHECK (${check})` : ''}
            `;

            const result = await this.supabaseAdmin.rpc('exec_sql', { sql: createPolicySql });
            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: `Policy "${name}" created successfully on table "${table}"` }],
            };
          }

          case 'update_policy': {
            if (!isUpdatePolicyArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid update policy arguments');
            }
            const { table, name, newDefinition, newCheck, newRoles } = request.params.arguments;

            const alterPolicySql = `
              ${newDefinition ? `ALTER POLICY "${name}" ON "${table}" USING (${newDefinition});` : ''}
              ${newCheck ? `ALTER POLICY "${name}" ON "${table}" WITH CHECK (${newCheck});` : ''}
              ${newRoles ? `ALTER POLICY "${name}" ON "${table}" TO ${newRoles.map(r => `"${r}"`).join(', ')};` : ''}
            `;

            const result = await this.supabaseAdmin.rpc('exec_sql', { sql: alterPolicySql });
            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: `Policy "${name}" updated successfully on table "${table}"` }],
            };
          }

          case 'delete_policy': {
            if (!isDeletePolicyArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid delete policy arguments');
            }
            const { table, name } = request.params.arguments;

            const result = await this.supabaseAdmin.rpc('exec_sql', {
              sql: `DROP POLICY "${name}" ON "${table}"`
            });
            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: `Policy "${name}" deleted successfully from table "${table}"` }],
            };
          }

          case 'toggle_rls': {
            if (!isToggleRlsArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid toggle RLS arguments');
            }
            const { table, enable } = request.params.arguments;

            const result = await this.supabaseAdmin.rpc('exec_sql', {
              sql: `ALTER TABLE "${table}" ${enable ? 'ENABLE' : 'DISABLE'} ROW LEVEL SECURITY`
            });
            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: `Row Level Security ${enable ? 'enabled' : 'disabled'} for table "${table}"` }],
            };
          }

          case 'query_data': {
            if (!isQueryDataArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid query data arguments');
            }
            const { table, select, filters } = request.params.arguments;
            let query = client.from(table).select(select);
            
            if (filters) {
              Object.entries(filters).forEach(([key, value]) => {
                query = query.eq(key, value);
              });
            }

            const result = await query;
            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
            };
          }

          case 'insert_data': {
            if (!isInsertDataArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid insert data arguments');
            }
            const { table, data } = request.params.arguments;
            const result = await client
              .from(table)
              .insert(data)
              .select();

            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
            };
          }

          case 'update_data': {
            if (!isUpdateDataArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid update data arguments');
            }
            const { table, data, filters } = request.params.arguments;
            let query = client.from(table).update(data);

            Object.entries(filters).forEach(([key, value]) => {
              query = query.eq(key, value);
            });

            const result = await query.select();
            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
            };
          }

          case 'delete_data': {
            if (!isDeleteDataArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid delete data arguments');
            }
            const { table, filters } = request.params.arguments;
            let query = client.from(table).delete();

            Object.entries(filters).forEach(([key, value]) => {
              query = query.eq(key, value);
            });

            const result = await query.select();
            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
            };
          }

          case 'list_tables': {
            const result = await this.supabaseAdmin.rpc('list_tables');
            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
            };
          }

          case 'upload_file': {
            if (!isUploadFileArgs(request.params.arguments)) {
              throw new McpError(ErrorCode.InvalidParams, 'Invalid upload file arguments');
            }
            const { bucket, path, data: fileData, contentType } = request.params.arguments;
            
            // Convert base64 to Uint8Array
            const binaryData = Buffer.from(fileData, 'base64');
            
            const result = await client.storage
              .from(bucket)
              .upload(path, binaryData, {
                contentType,
                upsert: true,
              });

            if (result.error) throw result.error;

            return {
              content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
            };
          }

          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error('Supabase operation error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [{ type: 'text', text: errorMessage }],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Supabase MCP server running on stdio');
  }
}

const server = new SupabaseServer();
server.run().catch(console.error);
