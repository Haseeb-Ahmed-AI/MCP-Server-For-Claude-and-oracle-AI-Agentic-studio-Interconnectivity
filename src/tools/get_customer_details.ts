/**
 * Tool: get_customer_details
 * ----------------------------
 * Returns the full profile for a single customer, given their exact
 * customer ID. This is the tool Claude will reach for once it (or the
 * user) already knows the specific customer ID — for example, after a
 * search_customers call has resolved a name to an ID.
 */

import { z } from "zod";
import { getCustomerById } from "../data_source.js";

export const getCustomerDetailsSchema = {
  name: "get_customer_details",
  description:
    "Get the full profile for a single customer by their exact customer " +
    "ID (e.g. 'CUST-0007'). Returns name, contact info, company, signup " +
    "date, status, and order summary. If you only have a name or email, " +
    "use search_customers first to find the customer ID.",
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

export const getCustomerDetailsZodSchema = z.object({
  customer_id: z.string().min(1, "customer_id must not be empty"),
});

export function handleGetCustomerDetails(args: unknown) {
  const { customer_id } = getCustomerDetailsZodSchema.parse(args);

  const customer = getCustomerById(customer_id);

  if (!customer) {
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

  // Full profile, but without the full order line items (that's what
  // get_customer_orders is for) — keeps this response focused on profile
  // info rather than duplicating order data across two tools.
  const { orders, ...profile } = customer;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            ...profile,
            most_recent_order: orders.length > 0 ? orders[orders.length - 1] : null,
          },
          null,
          2
        ),
      },
    ],
  };
}
