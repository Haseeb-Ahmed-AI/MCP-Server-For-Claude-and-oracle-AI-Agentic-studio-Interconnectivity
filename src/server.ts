#!/usr/bin/env node
/**
 * server.ts
 * ---------
 * Entry point for the customer-data MCP server. This wires up a stdio
 * transport (the standard way local MCP servers talk to Claude Desktop)
 * and registers the five customer-data tools defined in src/tools/.
 *
 * This file should stay "thin" — it only knows about tool
 * names/schemas/handlers, never about how data is fetched. All data
 * access lives in data_source.ts.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  searchCustomersSchema,
  handleSearchCustomers,
} from "./tools/search_customers.js";
import {
  getCustomerDetailsSchema,
  handleGetCustomerDetails,
} from "./tools/get_customer_details.js";
import {
  getCustomerOrdersSchema,
  handleGetCustomerOrders,
} from "./tools/get_customer_orders.js";
import {
  listCustomersByStatusSchema,
  handleListCustomersByStatus,
} from "./tools/list_customers_by_status.js";
import {
  getCustomerStatsSchema,
  handleGetCustomerStats,
} from "./tools/get_customer_stats.js";

// Registry mapping tool name -> { schema (for listing), handler (for calls) }
// Adding a new tool later just means adding one more entry here.
const TOOLS = {
  search_customers: {
    schema: searchCustomersSchema,
    handler: handleSearchCustomers,
  },
  get_customer_details: {
    schema: getCustomerDetailsSchema,
    handler: handleGetCustomerDetails,
  },
  get_customer_orders: {
    schema: getCustomerOrdersSchema,
    handler: handleGetCustomerOrders,
  },
  list_customers_by_status: {
    schema: listCustomersByStatusSchema,
    handler: handleListCustomersByStatus,
  },
  get_customer_stats: {
    schema: getCustomerStatsSchema,
    handler: handleGetCustomerStats,
  },
} as const;

const server = new Server(
  {
    name: "customer-data-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Advertise the available tools to Claude.
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(TOOLS).map((t) => t.schema),
  };
});

// Route a tool call to the right handler.
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  const tool = (TOOLS as Record<string, (typeof TOOLS)[keyof typeof TOOLS]>)[
    name
  ];

  if (!tool) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: `Unknown tool: ${name}` }),
        },
      ],
      isError: true,
    };
  }

  try {
    return tool.handler(args);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ error: `Tool '${name}' failed: ${message}` }),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr, not stdout — stdout is reserved for the MCP protocol
  // stream when running over stdio.
  console.error("customer-data-mcp server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error starting customer-data-mcp server:", err);
  process.exit(1);
});
