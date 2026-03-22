"use server";

import { requireAuth } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type {
  ActionResult,
  BankConnection,
  GoCardlessInstitution,
} from "@/lib/types";
import {
  institutionQuerySchema,
  createRequisitionSchema,
  requisitionStatusSchema,
  importTransactionsSchema,
  disconnectBankSchema,
  validate,
} from "@/lib/validation";

// ─── GoCardless Bank Account Data API ───
// Docs: https://bankaccountdata.gocardless.com/api/v2

const GC_BASE = "https://bankaccountdata.gocardless.com/api/v2";

// ─── Token management ───

interface GCTokenResponse {
  access: string;
  access_expires: number;
  refresh: string;
  refresh_expires: number;
}

let cachedToken: { access: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.access;
  }

  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;

  if (!secretId || !secretKey) {
    throw new Error("GoCardless API-sleutels niet geconfigureerd.");
  }

  const res = await fetch(`${GC_BASE}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret_id: secretId,
      secret_key: secretKey,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GoCardless token fout: ${res.status} ${body}`);
  }

  const data: GCTokenResponse = await res.json();

  cachedToken = {
    access: data.access,
    expiresAt: now + data.access_expires * 1000,
  };

  return cachedToken.access;
}

async function gcFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const res = await fetch(`${GC_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GoCardless API fout: ${res.status} ${body}`);
  }

  // DELETE returns 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ─── GoCardless API response shapes ───

interface GCInstitution {
  id: string;
  name: string;
  bic: string;
  logo: string;
  countries: string[];
}

interface GCRequisition {
  id: string;
  status: string;
  institution_id: string;
  link: string;
  accounts: string[];
  reference: string;
}

interface GCAccount {
  id: string;
  iban: string;
  institution_id: string;
  status: string;
  owner_name: string;
}

interface GCTransaction {
  transactionId: string;
  bookingDate: string;
  transactionAmount: {
    amount: string;
    currency: string;
  };
  remittanceInformationUnstructured?: string;
  creditorName?: string;
  creditorAccount?: { iban?: string };
  debtorName?: string;
  debtorAccount?: { iban?: string };
}

interface GCTransactionsResponse {
  transactions: {
    booked: GCTransaction[];
    pending: GCTransaction[];
  };
}

// ─── Server Actions ───

/**
 * Haal beschikbare banken op voor een land (standaard NL).
 */
export async function getInstitutions(
  country: string = "NL"
): Promise<ActionResult<GoCardlessInstitution[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };

  const v = validate(institutionQuerySchema, { country });
  if (v.error) return { error: v.error };

  try {
    const institutions = await gcFetch<GCInstitution[]>(
      `/institutions/?country=${encodeURIComponent(v.data!.country)}`
    );

    const mapped: GoCardlessInstitution[] = institutions.map((inst) => ({
      id: inst.id,
      name: inst.name,
      bic: inst.bic,
      logo: inst.logo,
      countries: inst.countries,
    }));

    return { error: null, data: mapped };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Fout bij ophalen banken.",
    };
  }
}

/**
 * Start het bank-koppelproces via GoCardless.
 * Retourneert de redirect URL waar de gebruiker heen gestuurd moet worden.
 */
export async function createRequisition(
  institutionId: string
): Promise<ActionResult<{ link: string; requisitionId: string }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { user } = auth;

  const v = validate(createRequisitionSchema, {
    institution_id: institutionId,
  });
  if (v.error) return { error: v.error };

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const redirectUrl = `${baseUrl}/api/webhooks/gocardless?ref=${user.id}`;

    const requisition = await gcFetch<GCRequisition>("/requisitions/", {
      method: "POST",
      body: JSON.stringify({
        redirect: redirectUrl,
        institution_id: v.data!.institution_id,
        reference: user.id,
        user_language: "NL",
      }),
    });

    // Sla de requisition op in bank_connections met status "pending"
    const supabase = createServiceClient();
    const { error: dbError } = await supabase.from("bank_connections").insert({
      user_id: user.id,
      institution_id: v.data!.institution_id,
      institution_name: v.data!.institution_id, // Wordt later bijgewerkt
      requisition_id: requisition.id,
      status: "pending",
    });

    if (dbError) return { error: dbError.message };

    return {
      error: null,
      data: {
        link: requisition.link,
        requisitionId: requisition.id,
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Fout bij starten bankkoppeling.",
    };
  }
}

/**
 * Controleer de status van een bankkoppeling en importeer accounts als gekoppeld.
 */
export async function getRequisitionStatus(
  requisitionId: string
): Promise<ActionResult<{ status: string; accounts: string[] }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };

  const v = validate(requisitionStatusSchema, {
    requisition_id: requisitionId,
  });
  if (v.error) return { error: v.error };

  try {
    const requisition = await gcFetch<GCRequisition>(
      `/requisitions/${v.data!.requisition_id}/`
    );

    // Werk de status bij in de database
    if (requisition.status === "LN" && requisition.accounts.length > 0) {
      const supabase = createServiceClient();

      // Haal account details op voor IBAN
      for (const accountId of requisition.accounts) {
        const account = await gcFetch<GCAccount>(
          `/accounts/${accountId}/`
        );

        await supabase
          .from("bank_connections")
          .update({
            status: "active",
            account_id: accountId,
            iban: account.iban ?? null,
          })
          .eq("requisition_id", requisition.id);
      }
    }

    return {
      error: null,
      data: {
        status: requisition.status,
        accounts: requisition.accounts,
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Fout bij controleren status.",
    };
  }
}

/**
 * Importeer transacties van een gekoppeld bankaccount.
 */
export async function importTransactions(
  accountId: string
): Promise<ActionResult<{ imported: number }>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { user } = auth;

  const v = validate(importTransactionsSchema, { account_id: accountId });
  if (v.error) return { error: v.error };

  try {
    // Zoek de connectie op
    const supabase = createServiceClient();
    const { data: connection, error: connError } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("account_id", v.data!.account_id)
      .eq("status", "active")
      .single();

    if (connError || !connection) {
      return { error: "Bankrekening niet gevonden of niet gekoppeld." };
    }

    // Haal transacties op van GoCardless
    const txResponse = await gcFetch<GCTransactionsResponse>(
      `/accounts/${v.data!.account_id}/transactions/`
    );

    const bookedTx = txResponse.transactions.booked;

    if (bookedTx.length === 0) {
      return { error: null, data: { imported: 0 } };
    }

    // Filter dubbele transacties op transaction_id
    const existingTxIds = new Set<string>();
    const { data: existingTx } = await supabase
      .from("bank_transactions")
      .select("external_id")
      .eq("user_id", user.id)
      .eq("bank_connection_id", connection.id);

    if (existingTx) {
      for (const tx of existingTx) {
        existingTxIds.add(tx.external_id);
      }
    }

    const newTransactions = bookedTx
      .filter((tx) => !existingTxIds.has(tx.transactionId))
      .map((tx) => ({
        user_id: user.id,
        bank_connection_id: connection.id,
        external_id: tx.transactionId,
        booking_date: tx.bookingDate,
        amount: parseFloat(tx.transactionAmount.amount),
        currency: tx.transactionAmount.currency,
        description: tx.remittanceInformationUnstructured ?? "",
        counterpart_name:
          tx.creditorName ?? tx.debtorName ?? null,
        counterpart_iban:
          tx.creditorAccount?.iban ?? tx.debtorAccount?.iban ?? null,
      }));

    if (newTransactions.length === 0) {
      return { error: null, data: { imported: 0 } };
    }

    const { error: insertError } = await supabase
      .from("bank_transactions")
      .insert(newTransactions);

    if (insertError) return { error: insertError.message };

    // Werk last_synced_at bij
    await supabase
      .from("bank_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", connection.id);

    return { error: null, data: { imported: newTransactions.length } };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? err.message
          : "Fout bij importeren transacties.",
    };
  }
}

/**
 * Haal alle gekoppelde bankrekeningen op van de ingelogde gebruiker.
 */
export async function getBankAccounts(): Promise<
  ActionResult<BankConnection[]>
> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("bank_connections")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: data ?? [] };
}

/**
 * Verwijder een bankkoppeling.
 */
export async function disconnectBank(
  connectionId: string
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(disconnectBankSchema, { connection_id: connectionId });
  if (v.error) return { error: v.error };

  // Zoek de connectie op
  const { data: connection, error: findError } = await supabase
    .from("bank_connections")
    .select("requisition_id")
    .eq("id", v.data!.connection_id)
    .eq("user_id", user.id)
    .single();

  if (findError || !connection) {
    return { error: "Bankkoppeling niet gevonden." };
  }

  // Verwijder de requisition bij GoCardless
  try {
    await gcFetch(`/requisitions/${connection.requisition_id}/`, {
      method: "DELETE",
    });
  } catch {
    // Als de GoCardless verwijdering faalt, verwijder alsnog lokaal
  }

  // Verwijder uit database
  const serviceClient = createServiceClient();
  const { error: deleteError } = await serviceClient
    .from("bank_connections")
    .delete()
    .eq("id", v.data!.connection_id)
    .eq("user_id", user.id);

  if (deleteError) return { error: deleteError.message };
  return { error: null };
}
