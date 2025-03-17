#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { formatSonarQubeError } from './common/errors.js';
import * as metrics from './operations/metrics.js';
import * as issues from './operations/issues.js';
import * as qualityGate from './operations/quality-gate.js';
import * as projects from './operations/projects.js';

const server = new Server(
  {
    name: "sonarqube-mcp-server",
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
        name: "get_project_metrics",
        description: "Get metrics for a SonarQube project (e.g., coverage, bugs, code smells)",
        inputSchema: zodToJsonSchema(metrics.GetProjectMetricsSchema),
      },
      {
        name: "get_quality_gate",
        description: "Get quality gate status for a project",
        inputSchema: zodToJsonSchema(qualityGate.GetQualityGateSchema),
      },
      {
        name: "get_issues",
        description: "Get issues (bugs, vulnerabilities, code smells) for a project",
        inputSchema: zodToJsonSchema(issues.GetIssuesSchema),
      },
      {
        name: "create_project",
        description: "Create a new project in SonarQube",
        inputSchema: zodToJsonSchema(projects.CreateProjectSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "get_project_metrics": {
        const args = metrics.GetProjectMetricsSchema.parse(request.params.arguments);
        const result = await metrics.getProjectMetrics(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_quality_gate": {
        const args = qualityGate.GetQualityGateSchema.parse(request.params.arguments);
        const result = await qualityGate.getQualityGate(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "get_issues": {
        const args = issues.GetIssuesSchema.parse(request.params.arguments);
        const result = await issues.getIssues(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "create_project": {
        const args = projects.CreateProjectSchema.parse(request.params.arguments);
        const result = await projects.createProject(args);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    throw new Error(formatSonarQubeError(error));
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
  console.error('SonarQube MCP Server running on stdio');
}

runServer().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
