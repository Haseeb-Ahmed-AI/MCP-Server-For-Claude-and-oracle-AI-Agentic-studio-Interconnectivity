/**
 * Tool: search_customers
 * -----------------------
 * Lets Claude search for customers by name, email, or company using a
 * partial, case-insensitive match. This is the tool Claude will reach for
 * when the user gives a fuzzy identifier ("find John Smith", "look up
 * anyone at Acme Co") rather than an exact customer ID.
 */

import { z } from "zod";
import { searchCustomers } from "../data_source.js";

export const searchCustomersSchema = {
  name: "search_customers",
  description:
    "Search for customers by name, email, or company name. Performs a " +
    "case-insensitive partial match, so 'smith' will match 'John Smith' " +
    "and 'jane.smith@...'. Returns a list of matching customers with " +
    "their basic profile info (does not include full order history — use " +
    "get_customer_details or get_customer_orders for that). Use this when " +
    "the user gives a name, email, or company rather than an exact " +
    "customer ID.",
  inputSchema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "Search text to match against customer name, email, or company " +
          "(partial match, case-insensitive). Example: 'smith', 'acme', " +
          "'john@example.com'.",
      },
    },
    required: ["query"],
  },
};

export const searchCustomersZodSchema = z.object({
  query: z.string().min(1, "query must not be empty"),
});

export function handleSearchCustomers(args: unknown) {
  const { query } = searchCustomersZodSchema.parse(args);

  const results = searchCustomers(query);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            query,
            match_count: results.length,
            customers: results.map((c) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              company: c.company,
              status: c.status,
              total_orders: c.total_orders,
              lifetime_value: c.lifetime_value,
            })),
          },
          null,
          2
        ),
      },
    ],
  };
}
