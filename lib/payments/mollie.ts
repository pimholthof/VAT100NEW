/**
 * Mollie payment integration for invoice payments.
 *
 * Requires MOLLIE_API_KEY environment variable.
 * Docs: https://docs.mollie.com/reference/v2/payments-api
 */

import { getErrorMessage } from "@/lib/utils/errors";

const MOLLIE_API_BASE = "https://api.mollie.com/v2";

function getMollieKey(): string | null {
  return process.env.MOLLIE_API_KEY ?? null;
}

export async function mollieRequest<T>(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
): Promise<{ data?: T; error?: string }> {
  const apiKey = getMollieKey();
  if (!apiKey) return { error: "Mollie API-sleutel niet geconfigureerd." };

  try {
    const response = await fetch(`${MOLLIE_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: response.statusText }));
      return { error: err.detail ?? `Mollie fout: ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (e) {
    return { error: getErrorMessage(e) };
  }
}

export interface MolliePayment {
  id: string;
  status: "open" | "canceled" | "pending" | "authorized" | "expired" | "failed" | "paid";
  amount: { value: string; currency: string };
  description: string;
  method: string | null;
  customerId?: string;
  subscriptionId?: string;
  sequenceType?: "oneoff" | "first" | "recurring";
  metadata?: Record<string, string>;
  _links: {
    checkout?: { href: string };
    self: { href: string };
  };
}

export async function createMolliePayment(params: {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  description: string;
  redirectUrl: string;
  webhookUrl: string;
}): Promise<{ data?: MolliePayment; error?: string }> {
  return mollieRequest<MolliePayment>("POST", "/payments", {
    amount: {
      value: params.amount.toFixed(2),
      currency: "EUR",
    },
    description: params.description,
    redirectUrl: params.redirectUrl,
    webhookUrl: params.webhookUrl,
    metadata: {
      invoice_id: params.invoiceId,
      invoice_number: params.invoiceNumber,
    },
  });
}

export async function getMolliePayment(
  paymentId: string,
): Promise<{ data?: MolliePayment; error?: string }> {
  return mollieRequest<MolliePayment>("GET", `/payments/${paymentId}`);
}

export function isMollieConfigured(): boolean {
  return !!getMollieKey();
}
