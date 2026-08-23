/**
 * Tool: list_customers_by_status
 * ---------------------------------
 * Lists all customers matching a given status: active, inactive, or
 * churned. Useful for "show me all active customers" or "which customers
 * have churned?" style questions.
 */

import { z } from "zod";
import { getCustomersByStatus } from "../data_source.js";

const STATUS_VALUES = ["active", "inactive", "churned"] as const;

export const listCustomersByStatusSchema = {
  name: "list_customers_by_status",
  description:
    "List all customers with a given status. Valid statuses are " +
    "'active', 'inactive', or 'churned'. Returns each matching " +
    "customer's basic profile info. Use this for questions like 'show me " +
    "all active customers' or 'which customers have churned?'",
  inputSchema: {
    type: "object" as const,
    properties: {
      status: {
        type: "string",
        enum: STATUS_VALUES as unknown as string[],
        description: "The customer status to filter by.",
      },
    },
    required: ["status"],
  },
};

export const listCustomersByStatusZodSchema = z.object({
  status: z.enum(STATUS_VALUES),
});

export function handleListCustomersByStatus(args: unknown) {
  const { status } = listCustomersByStatusZodSchema.parse(args);

  const customers = getCustomersByStatus(status);

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            status,
            match_count: customers.length,
            customers: customers.map((c) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              company: c.company,
              signup_date: c.signup_date,
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
