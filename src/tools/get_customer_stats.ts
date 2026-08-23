/**
 * Tool: get_customer_stats
 * ---------------------------
 * Returns summary stats for a single customer: total spend, order count,
 * and average order value. Useful for "how much has X spent with us?" or
 * "what's the average order value for customer CUST-0012?" style
 * questions.
 */

import { z } from "zod";
import { getCustomerStats } from "../data_source.js";

export const getCustomerStatsSchema = {
  name: "get_customer_stats",
  description:
    "Get summary spend statistics for a single customer by their exact " +
    "customer ID (e.g. 'CUST-0007'): total order count, total spend " +
    "(excluding cancelled/refunded orders), average order value, and " +
    "lifetime value. Use this for questions about how much a specific " +
    "customer has spent, rather than their raw order list.",
  inputSchema: {
    type: "object" as const,
    properties: {
      customer_id: {
        type: "string",
        description: "The exact customer ID, e.g. 'CUST-0007'.",
      },
    },
    required: ["customer_id"],
  },
};

export const getCustomerStatsZodSchema = z.object({
  customer_id: z.string().min(1, "customer_id must not be empty"),
});

export function handleGetCustomerStats(args: unknown) {
  const { customer_id } = getCustomerStatsZodSchema.parse(args);

  const stats = getCustomerStats(customer_id);

  if (!stats) {
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: `No customer found with ID '${customer_id}'.`,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(stats, null, 2),
      },
    ],
  };
}
