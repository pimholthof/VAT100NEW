/**
 * Mollie Subscriptions API for recurring payments.
 *
 * Uses the shared mollieRequest helper from mollie.ts.
 * Docs: https://docs.mollie.com/reference/v2/subscriptions-api
 */

import { mollieRequest, type MolliePayment } from "./mollie";

// ── Types ──

export interface MollieCustomer {
  id: string;
  name: string;
  email: string;
  _links: { self: { href: string } };
}

export interface MollieMandate {
  id: string;
  status: "valid" | "pending" | "invalid";
  method: string;
}

export interface MollieMandateList {
  count: number;
  _embedded: { mandates: MollieMandate[] };
}

export interface MollieSubscription {
  id: string;
  customerId: string;
  status: "active" | "pending" | "suspended" | "canceled" | "completed";
  amount: { value: string; currency: string };
  interval: string;
  description: string;
  webhookUrl: string;
  _links: { self: { href: string } };
}

// ── Functions ──

export async function createMollieCustomer(
  name: string,
  email: string,
): Promise<{ data?: MollieCustomer; error?: string }> {
  return mollieRequest<MollieCustomer>("POST", "/customers", { name, email });
}

export async function createFirstPayment(params: {
  customerId: string;
  amount: number;
  description: string;
  redirectUrl: string;
  webhookUrl: string;
  metadata?: Record<string, string>;
}): Promise<{ data?: MolliePayment; error?: string }> {
  return mollieRequest<MolliePayment>("POST", "/payments", {
    amount: {
      value: params.amount.toFixed(2),
      currency: "EUR",
    },
    customerId: params.customerId,
    sequenceType: "first",
    description: params.description,
    redirectUrl: params.redirectUrl,
    webhookUrl: params.webhookUrl,
    metadata: params.metadata,
  });
}

export async function getCustomerMandates(
  customerId: string,
): Promise<{ data?: MollieMandate[]; error?: string }> {
  const result = await mollieRequest<MollieMandateList>(
    "GET",
    `/customers/${customerId}/mandates`,
  );
  if (result.error) return { error: result.error };
  return { data: result.data?._embedded?.mandates ?? [] };
}

export async function createMollieSubscription(params: {
  customerId: string;
  amount: number;
  interval: string;
  description: string;
  webhookUrl: string;
}): Promise<{ data?: MollieSubscription; error?: string }> {
  return mollieRequest<MollieSubscription>(
    "POST",
    `/customers/${params.customerId}/subscriptions`,
    {
      amount: {
        value: params.amount.toFixed(2),
        currency: "EUR",
      },
      interval: params.interval,
      description: params.description,
      webhookUrl: params.webhookUrl,
    },
  );
}

export async function cancelMollieSubscription(
  customerId: string,
  subscriptionId: string,
): Promise<{ data?: MollieSubscription; error?: string }> {
  return mollieRequest<MollieSubscription>(
    "DELETE",
    `/customers/${customerId}/subscriptions/${subscriptionId}`,
  );
}

export async function getMollieSubscription(
  customerId: string,
  subscriptionId: string,
): Promise<{ data?: MollieSubscription; error?: string }> {
  return mollieRequest<MollieSubscription>(
    "GET",
    `/customers/${customerId}/subscriptions/${subscriptionId}`,
  );
}
