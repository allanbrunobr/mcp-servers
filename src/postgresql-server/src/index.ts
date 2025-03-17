#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { setTimeout } from 'timers/promises';
import pg from 'pg';

const { Pool } = pg;

class PostgreSQLServer {
  private server: Server;
  private pool: pg.Pool;

  constructor() {
    // Configuração do pool de conexões PostgreSQL
    this.pool = new Pool({
      user: process.env.POSTGRES_USER || 'user',
      password: process.env.POSTGRES_PASSWORD || 'password',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'config_manager'
    });

    this.server = new Server(
      {
        name: 'postgresql-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.pool.end();
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'query',
          description: 'Execute uma consulta SQL no PostgreSQL (suporta SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              sql: {
                type: 'string',
                description: 'Consulta SQL a ser executada (DQL, DML ou DDL)'
              },
              params: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Parâmetros para a consulta SQL (opcional)'
              }
            },
            required: ['sql'],
            additionalProperties: false
          }
        },
        {
          name: 'get_schema',
          description: 'Obtém o esquema do banco de dados PostgreSQL (tabelas, colunas, tipos, chaves estrangeiras)',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name === 'query') {
        const { sql, params = [] } = request.params.arguments as { sql: string; params?: string[] };

        try {
          const result = await this.pool.query(sql, params);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.rows, null, 2),
              },
            ],
          };
        } catch (error) {
          if (error instanceof Error) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Erro na consulta SQL: ${error.message}`,
                },
              ],
              isError: true,
            };
          }
          throw error;
        }
      } else if (request.params.name === 'get_schema') {
        try {
          // Consulta para obter informações sobre tabelas
          const tablesQuery = `
            SELECT 
              t.table_name, 
              t.table_schema
            FROM 
              information_schema.tables t
            WHERE 
              t.table_schema NOT IN ('pg_catalog', 'information_schema')
              AND t.table_type = 'BASE TABLE'
            ORDER BY 
              t.table_schema, 
              t.table_name;
          `;
          
          const tables = await this.pool.query(tablesQuery);
          
          // Consulta para obter informações sobre colunas
          const columnsQuery = `
            SELECT 
              c.table_schema,
              c.table_name, 
              c.column_name, 
              c.data_type,
              c.is_nullable,
              c.column_default
            FROM 
              information_schema.columns c
            WHERE 
              c.table_schema NOT IN ('pg_catalog', 'information_schema')
            ORDER BY 
              c.table_schema,
              c.table_name, 
              c.ordinal_position;
          `;
          
          const columns = await this.pool.query(columnsQuery);
          
          // Consulta para obter informações sobre chaves estrangeiras
          const foreignKeysQuery = `
            SELECT
              tc.table_schema, 
              tc.constraint_name,
              tc.table_name, 
              kcu.column_name, 
              ccu.table_schema AS foreign_table_schema,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name 
            FROM 
              information_schema.table_constraints AS tc 
              JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
              JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
            ORDER BY
              tc.table_schema,
              tc.table_name;
          `;
          
          const foreignKeys = await this.pool.query(foreignKeysQuery);
          
          // Consulta para obter informações sobre índices
          const indexesQuery = `
            SELECT
              schemaname AS table_schema,
              tablename AS table_name,
              indexname AS index_name,
              indexdef AS index_definition
            FROM
              pg_indexes
            WHERE
              schemaname NOT IN ('pg_catalog', 'information_schema')
            ORDER BY
              schemaname,
              tablename;
          `;
          
          const indexes = await this.pool.query(indexesQuery);
          
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  tables: tables.rows,
                  columns: columns.rows,
                  foreignKeys: foreignKeys.rows,
                  indexes: indexes.rows
                }, null, 2),
              },
            ],
          };
        } catch (error) {
          if (error instanceof Error) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Erro ao obter esquema do banco: ${error.message}`,
                },
              ],
              isError: true,
            };
          }
          throw error;
        }
      } else {
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Ferramenta desconhecida: ${request.params.name}`
        );
      }
    });
  }

  async run() {
    let connected = false;
    let retries = 0;
    const maxRetries = 5;
    
    while (!connected && retries < maxRetries) {
      try {
        // Testa a conexão com o banco
        await this.pool.query('SELECT NOW()');
        console.error('Conectado ao PostgreSQL com sucesso');
        connected = true;
      } catch (error) {
        retries++;
        console.error(`Tentativa ${retries}/${maxRetries} falhou: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        
        if (retries < maxRetries) {
          console.error(`Tentando novamente em 3 segundos...`);
          await setTimeout(3000); // Espera 3 segundos antes de tentar novamente
        }
      }
    }
    
    if (!connected) {
      console.error(`Não foi possível conectar ao PostgreSQL após ${maxRetries} tentativas.`);
      console.error('Iniciando o servidor MCP mesmo assim, as ferramentas retornarão erros até que a conexão seja estabelecida.');
    }
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Servidor MCP PostgreSQL rodando em stdio');
  }
}

const server = new PostgreSQLServer();
server.run().catch(console.error);
