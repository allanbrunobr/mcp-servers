#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createPool } from "./src/commons/db.js";
import { query as queryOperation } from "./src/operations/query.js";
import { insert as insertOperation } from "./src/operations/insert.js";
import { update as updateOperation } from "./src/operations/update.js";
import { deleteOp as deleteOperation } from "./src/operations/delete.js";
import { createTable as createTableOperation } from "./src/operations/createTable.js";
import { alterTable as alterTableOperation } from "./src/operations/alterTable.js";
import { dropTable as dropTableOperation } from "./src/operations/dropTable.js";

const server = new Server(
  {
    name: "example-servers/postgres",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("Please provide a database URL in the environment variables");
  process.exit(1);
}

const { pool, resourceBaseUrl } = createPool(databaseUrl);

const SCHEMA_PATH = "schema";

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    return {
      resources: result.rows.map((row: any) => ({
        uri: new URL(`${row.table_name}/${SCHEMA_PATH}`, resourceBaseUrl).href,
        mimeType: "application/json",
        name: `"${row.table_name}" database schema`,
      })),
    };
  } finally {
    client.release();
  }
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const resourceUrl = new URL(request.params.uri);

  const pathComponents = resourceUrl.pathname.split("/");
  const schema = pathComponents.pop();
  const tableName = pathComponents.pop();

  if (schema !== SCHEMA_PATH) {
    throw new Error("Invalid resource URI");
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
      [tableName],
    );

    return {
      contents: [
        {
          uri: request.params.uri,
          mimeType: "application/json",
          text: JSON.stringify(result.rows, null, 2),
        },
      ],
    };
  } finally {
    client.release();
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query",
        description: "Run a read-only SQL query",
        inputSchema: {
          type: "object",
          properties: {
            sql: { type: "string" },
          },
        },
      },
      {
        name: "insert",
        description: "Insert data into a table",
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string" },
            data: { type: "object" },
          },
          required: ["table", "data"],
        },
      },
      {
        name: "update",
        description: "Update data in a table",
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string" },
            data: { type: "object" },
            where: { type: "object" },
          },
          required: ["table", "data", "where"],
        },
      },
      {
        name: "delete",
        description: "Delete data from a table",
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string" },
            where: { type: "object" },
          },
          required: ["table", "where"],
        },
      },
      {
        name: "createTable",
        description: "Create a new table",
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string" },
            schema: { type: "string" },
          },
          required: ["table", "schema"],
        },
      },
      {
        name: "alterTable",
        description: "Alter an existing table",
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string" },
            alteration: { type: "string" },
          },
          required: ["table", "alteration"],
        },
      },
      {
        name: "dropTable",
        description: "Drop an existing table",
        inputSchema: {
          type: "object",
          properties: {
            table: { type: "string" },
          },
          required: ["table"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "query":
      return queryOperation(pool, request);
    case "insert":
      return insertOperation(pool, request);
    case "update":
      return updateOperation(pool, request);
    case "delete":
      return deleteOperation(pool, request);
    case "createTable":
      return createTableOperation(pool, request);
    case "alterTable":
      return alterTableOperation(pool, request);
    case "dropTable":
      return dropTableOperation(pool, request);
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch(console.error);
