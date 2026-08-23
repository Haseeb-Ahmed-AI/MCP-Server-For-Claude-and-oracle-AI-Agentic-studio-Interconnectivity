/**
 * data_source.ts
 * ---------------
 * This is the ONLY module in the project that touches raw customer data.
 *
 * Today it reads from a local mock JSON file (data/customers.json). Every
 * MCP tool in src/tools/ calls into the functions exported here rather than
 * touching the JSON file (or any future API) directly.
 *
 * >>> THIS IS THE SWAP POINT FOR ORACLE AI AGENT STUDIO <<<
 * When it's time to connect to the real Oracle AI Agent Studio backend,
 * this file is the only one that needs to change. See the comment block
 * at the bottom of the file for exactly what that involves. The function
 * signatures below (getCustomerById, searchCustomers, etc.) should stay
 * the same so that src/tools/*.ts never needs to be touched.
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Resolve the path to data/customers.json relative to this file, so the
// server works no matter what directory it's launched from (important for
// stdio-based MCP servers, which Claude Desktop launches with its own cwd).
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_FILE = join(__dirname, "..", "data", "customers.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CustomerStatus = "active" | "inactive" | "churned";

export interface Order {
  order_id: string;
  date: string; // YYYY-MM-DD
  product: string;
  amount: number;
  status: "completed" | "shipped" | "processing" | "cancelled" | "refunded";
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  signup_date: string; // YYYY-MM-DD
  status: CustomerStatus;
  total_orders: number;
  lifetime_value: number;
  orders: Order[];
}

// ---------------------------------------------------------------------------
// Internal loading
// ---------------------------------------------------------------------------

// Simple in-memory cache so we don't re-read/parse the JSON file on every
// single tool call. Since this is mock/local data that never changes at
// runtime, caching for the life of the process is safe.
let _cache: Customer[] | null = null;

function loadCustomers(): Customer[] {
  if (_cache) return _cache;

  const raw = readFileSync(DATA_FILE, "utf-8");
  _cache = JSON.parse(raw) as Customer[];
  return _cache;
}

// ---------------------------------------------------------------------------
// Public data access functions
// These are the functions the MCP tools call. Keep this surface stable.
// ---------------------------------------------------------------------------

/**
 * Look up a single customer by their exact ID (e.g. "CUST-0007").
 * Returns null if no customer with that ID exists.
 */
export function getCustomerById(id: string): Customer | null {
  const customers = loadCustomers();
  const match = customers.find(
    (c) => c.id.toLowerCase() === id.toLowerCase()
  );
  return match ?? null;
}

/**
 * Search customers by name, email, or company using a case-insensitive
 * partial (substring) match. Matches if the query appears in ANY of those
 * three fields.
 */
export function searchCustomers(query: string): Customer[] {
  const customers = loadCustomers();
  const q = query.trim().toLowerCase();

  if (!q) return [];

  return customers.filter((c) => {
    const name = c.name.toLowerCase();
    const email = c.email.toLowerCase();
    const company = (c.company ?? "").toLowerCase();
    return name.includes(q) || email.includes(q) || company.includes(q);
  });
}

/**
 * Get the order history for a single customer by ID.
 * Returns null if the customer doesn't exist (as opposed to an empty
 * array, which means the customer exists but has no orders).
 */
export function getCustomerOrders(id: string): Order[] | null {
  const customer = getCustomerById(id);
  if (!customer) return null;
  return customer.orders;
}

/**
 * Get all customers with a given status (active / inactive / churned).
 */
export function getCustomersByStatus(status: CustomerStatus): Customer[] {
  const customers = loadCustomers();
  return customers.filter((c) => c.status === status);
}

/**
 * Compute summary stats for a single customer: total spend, order count,
 * and average order value. "Total spend" excludes refunded/cancelled
 * orders since those never converted into real revenue.
 * Returns null if the customer doesn't exist.
 */
export function getCustomerStats(id: string): {
  customer_id: string;
  name: string;
  total_orders: number;
  total_spend: number;
  average_order_value: number;
  lifetime_value: number;
} | null {
  const customer = getCustomerById(id);
  if (!customer) return null;

  const countedOrders = customer.orders.filter(
    (o) => o.status !== "refunded" && o.status !== "cancelled"
  );

  const totalSpend = Math.round(
    countedOrders.reduce((sum, o) => sum + o.amount, 0) * 100
  ) / 100;

  const averageOrderValue =
    countedOrders.length > 0
      ? Math.round((totalSpend / countedOrders.length) * 100) / 100
      : 0;

  return {
    customer_id: customer.id,
    name: customer.name,
    total_orders: customer.total_orders,
    total_spend: totalSpend,
    average_order_value: averageOrderValue,
    lifetime_value: customer.lifetime_value,
  };
}

// ---------------------------------------------------------------------------
// SWAPPING THIS FOR REAL ORACLE AI AGENT STUDIO DATA
// ---------------------------------------------------------------------------
// When the real backend is ready, this file is the only one that changes.
// The five exported functions above keep the exact same names and return
// shapes — every MCP tool in src/tools/ calls those functions and doesn't
// know or care where the data comes from.
//
// What actually needs to change here:
//
// 1. Auth handling
//    - Add an auth layer (e.g. OAuth client credentials flow, or an API
//      key/bearer token) to obtain and refresh a token for Oracle AI Agent
//      Studio's API. This likely means reading credentials from environment
//      variables (e.g. ORACLE_CLIENT_ID, ORACLE_CLIENT_SECRET,
//      ORACLE_AGENT_STUDIO_BASE_URL) rather than hardcoding anything.
//    - Consider a small token cache (similar to the `_cache` pattern above)
//      so we're not re-authenticating on every tool call.
//
// 2. Replace loadCustomers() and its local JSON read with authenticated
//    REST calls to Oracle's API, e.g.:
//      - getCustomerById(id)      -> GET /customers/{id}
//      - searchCustomers(query)   -> GET /customers/search?q={query}
//      - getCustomersByStatus(s)  -> GET /customers?status={status}
//    Use fetch()/axios with the auth token attached, map Oracle's response
//    shape onto the Customer/Order TypeScript interfaces above (or update
//    the interfaces if Oracle's schema differs), and handle pagination if
//    Oracle returns paged results.
//
// 3. Error handling / resilience
//    - Local JSON reads basically never fail. A real API can time out,
//      rate-limit, or return errors — add try/catch, sensible timeouts,
//      and clear error messages so the MCP tools can surface something
//      useful back to Claude instead of crashing the server.
//
// 4. Remove the in-memory `_cache` (or turn it into a short-TTL cache)
//    since real customer data can change between calls, unlike this
//    static mock file.
// ---------------------------------------------------------------------------
