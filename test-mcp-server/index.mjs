#!/usr/bin/env node

/**
 * Simple test MCP server that provides a "get_time" tool.
 * Uses stdio transport for communication.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "test-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_time",
        description: "Get the current time in ISO format",
        inputSchema: {
          type: "object",
          properties: {
            timezone: {
              type: "string",
              description: "Optional timezone (e.g., 'America/New_York')",
            },
          },
        },
      },
      {
        name: "echo",
        description: "Echo back the input message",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Message to echo back",
            },
          },
          required: ["message"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_time") {
    const now = new Date();
    return {
      content: [
        {
          type: "text",
          text: `Current time: ${now.toISOString()}`,
        },
      ],
    };
  }

  if (name === "echo") {
    return {
      content: [
        {
          type: "text",
          text: `Echo: ${args?.message ?? "(no message)"}`,
        },
      ],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Test MCP server started");
