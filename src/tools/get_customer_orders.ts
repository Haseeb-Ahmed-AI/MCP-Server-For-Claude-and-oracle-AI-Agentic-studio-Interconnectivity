/**
 * Tool: get_customer_orders
 * ----------------------------
 * Returns the full order history for a single customer, given their
 * exact customer ID. Useful for "what has X ordered?" style questions.
 */

import { z } from "zod";
import { getCustomerById, getCustomerOrders } from "../data_source.js";

export const getCustomerOrdersSchema = {
  name: "get_customer_orders",
  description:
    "Get the full order history for a single customer by their exact " +
    "customer ID (e.g. 'CUST-0007'). Returns a list of orders, each with " +
    "an order ID, date, product, amount, and order status. If you only " +
    "have a name or email, use search_customers first to find the " +
    "customer ID.",
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

export const getCustomerOrdersZodSchema = z.object({
  customer_id: z.string().min(1, "customer_id must not be empty"),
});

export function handleGetCustomerOrders(args: unknown) {
  const { customer_id } = getCustomerOrdersZodSchema.parse(args);

  const customer = getCustomerById(customer_id);
  const orders = getCustomerOrders(customer_id);

  if (!customer || orders === null) {
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
        text: JSON.stringify(
          {
            customer_id: customer.id,
            name: customer.name,
            order_count: orders.length,
            orders,
          },
          null,
          2
        ),
      },
    ],
  };
}
