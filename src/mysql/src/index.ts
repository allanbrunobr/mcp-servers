#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dbPool from "./commons/db.js";
import { query as queryOperation } from "./operations/query.js";
import { insert as insertOperation } from "./operations/insert.js";
import { update as updateOperation } from "./operations/update.js";
import { deleteOp as deleteOperation } from "./operations/delete.js";
import { createTable as createTableOperation } from "./operations/createTable.js";
import { alterTable as alterTableOperation } from "./operations/alterTable.js";
import { dropTable as dropTableOperation } from "./operations/dropTable.js";

const server = new Server(
  {
    name: "example-servers/mysql",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

const SCHEMA_PATH = "schema";

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const [rows] = await dbPool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'MPRS'"
  );

  return {
    resources: (rows as any[]).map((row) => ({
      uri: new URL(
        `${row.TABLE_NAME}/${SCHEMA_PATH}`,
        "mysql://user:password@host:port/database"
      ).href,
      mimeType: "application/json",
      name: `"${row.TABLE_NAME}" database schema`,
    })),
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const resourceUrl = new URL(request.params.uri);

  const pathComponents = resourceUrl.pathname.split("/");
  const schema = pathComponents.pop();
  const tableName = pathComponents.pop();

  if (schema !== SCHEMA_PATH) {
    throw new Error("Invalid resource URI");
  }

  const [rows] = await dbPool.query(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = ? AND table_schema = 'MPRS'",
    [tableName]
  );

  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(
          (rows as any[]).map((row) => ({
            column_name: row.COLUMN_NAME,
            data_type: row.DATA_TYPE,
          })),
          null,
          2
        ),
      },
    ],
  };
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
          required: ["sql"],
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
      return queryOperation(request);
    case "insert":
      return insertOperation(request);
    case "update":
      return updateOperation(request);
    case "delete":
      return deleteOperation(request);
    case "createTable":
      return createTableOperation(request);
    case "alterTable":
      return alterTableOperation(request);
    case "dropTable":
      return dropTableOperation(request);
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MySQL MCP server running on stdio");
}

// Handle cleanup
process.on("SIGINT", async () => {
  await dbPool.end();
  process.exit(0);
});

runServer().catch(console.error);
