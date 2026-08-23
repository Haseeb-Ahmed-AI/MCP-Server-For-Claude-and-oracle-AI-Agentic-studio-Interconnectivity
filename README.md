# mcp-oracle-claude desktop

A local MCP (Model Context Protocol) server that exposes customer data as
queryable tools, so Claude can answer natural language questions about
customers by calling this server directly.

Right now the data is mocked locally (`data/customers.json`, 28 fake
customer records with order history). Later, the mock data layer can be
swapped for a real connection to **Oracle AI Agent Studio** without
touching any of the MCP tool code — see
[Swapping in Oracle AI Agent Studio](#swapping-in-oracle-ai-agent-studio)
below.

## What this project does

It's a stdio-based MCP server with five tools:

| Tool | What it does |
|---|---|
| `search_customers` | Search by name, email, or company (partial match) |
| `get_customer_details` | Full profile for one customer, by exact ID |
| `get_customer_orders` | Order history for one customer |
| `list_customers_by_status` | Filter customers by status: active / inactive / churned |
| `get_customer_stats` | Total spend, order count, avg order value for one customer |

Once registered in Claude Desktop as a custom connector, Claude can call
these tools on its own to answer questions like "which customers have
churned?" or "what has John Smith ordered?"

## Project structure

```
/mcp-oracle-demo
  /data
    customers.json          # mock customer + order data
  /src
    data_source.ts          # ONLY file that touches raw data — the Oracle swap point
    server.ts                # MCP server entry point, registers all tools
    tools/
      search_customers.ts
      get_customer_details.ts
      get_customer_orders.ts
      list_customers_by_status.ts
      get_customer_stats.ts
  /test
    test_data_source.ts     # manual test walkthrough (npm test)
  package.json
  tsconfig.json
  README.md
```

## Install and run locally

Requires Node.js 18+.

```bash
cd mcp-oracle-demo
npm install
npm run build      # compiles src/ -> dist/
npm start           # runs the compiled server over stdio
```

For local development without a build step:

```bash
npm run dev          # runs src/server.ts directly via tsx
```

To verify everything works before wiring it into Claude Desktop, run the
test walkthrough, which exercises the data access layer and every tool
handler and prints PASS/FAIL for each check:

```bash
npm test
```

A stdio MCP server doesn't print anything to stdout on its own (stdout is
reserved for the protocol stream) — you'll see a
`customer-data-mcp server running on stdio` line on stderr once it starts,
and it will then wait for a client (like Claude Desktop) to connect.

## Register it in Claude Desktop

Add an entry to your `claude_desktop_config.json` (Claude Desktop menu →
Settings → Developer → Edit Config), pointing at the **compiled** server:

```json
{
  "mcpServers": {
    "customer-data": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-oracle-demo/dist/server.js"]
    }
  }
}
```

Use an absolute path — Claude Desktop launches the process from its own
working directory, not this project's folder. Restart Claude Desktop
after saving the config, and you should see "customer-data" listed as a
connected tool source (look for the 🔌 / tools icon in a new chat).

## Example questions to try once connected

- "Show me all active customers."
- "What has [customer name] ordered?"
- "Which customers have churned?"
- "How much has customer CUST-0012 spent with us, and what's their average order value?"
- "Find any customers at Acme Co."

## Swapping in Oracle AI Agent Studio

`src/data_source.ts` is the **only** file that touches raw customer data.
Every MCP tool calls into its exported functions
(`getCustomerById`, `searchCustomers`, `getCustomerOrders`,
`getCustomersByStatus`, `getCustomerStats`) rather than reading the JSON
file directly — so connecting to the real backend later means editing
this one file, not the tool definitions or the server.

What would need to change inside `data_source.ts`:

1. **Auth handling** — add a token flow (e.g. OAuth client credentials or
   API key) for Oracle AI Agent Studio's API, likely reading credentials
   from environment variables instead of anything hardcoded, plus a
   short-lived token cache so we're not re-authenticating on every call.
2. **Replace the local JSON read** (`loadCustomers()`) with authenticated
   REST calls to Oracle's endpoints — e.g. `GET /customers/{id}`,
   `GET /customers/search?q=...`, `GET /customers?status=...` — and map
   Oracle's response shape onto the `Customer` / `Order` TypeScript
   interfaces already defined in that file (or adjust the interfaces if
   Oracle's schema differs).
3. **Error handling** — a real API can time out, rate-limit, or error in
   ways a local file read never does, so add try/catch and clear error
   messages the tools can surface back to Claude.
4. **Caching** — the current in-memory cache assumes static data; against
   a live backend this should either be removed or given a short TTL.

The full detail on each of these points is also commented directly at the
bottom of `src/data_source.ts`.

## Testing

`npm test` runs `test/test_data_source.ts`, which:

- Calls every `data_source.ts` function directly and checks results
  against known properties of the mock data (e.g. a known customer ID
  resolves, an unknown one returns `null`, search is case-insensitive).
- Calls every tool's handler function directly (bypassing the MCP
  transport) and checks the JSON it returns is well-formed and matches
  the underlying data.

This is a plain script (no test framework) so it's easy to read and
explain line-by-line in a screen-share demo.
=======
