"use server";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import { sanitizeError } from "@/lib/errors";
import { logAdminAction } from "@/lib/admin/audit";

export async function exportUserData(userId: string): Promise<ActionResult<string>> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  try {
    const supabase = createServiceClient();

    const [
      { data: profile },
      { data: invoices },
      { data: clients },
      { data: receipts },
      { data: quotes },
      { data: bankTransactions },
      { data: hoursLog },
      { data: trips },
      { data: assets },
      { data: subscriptions },
      { data: taxPayments },
      { data: vatReturns },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).single(),
      supabase.from("invoices").select("*, invoice_lines(*)").eq("user_id", userId),
      supabase.from("clients").select("*").eq("user_id", userId),
      supabase.from("receipts").select("*").eq("user_id", userId),
      supabase.from("quotes").select("*, quote_lines(*)").eq("user_id", userId),
      supabase.from("bank_transactions").select("*").eq("user_id", userId),
      supabase.from("hours_log").select("*").eq("user_id", userId),
      supabase.from("trips").select("*").eq("user_id", userId),
      supabase.from("assets").select("*").eq("user_id", userId),
      supabase.from("subscriptions").select("*").eq("user_id", userId),
      supabase.from("tax_payments").select("*").eq("user_id", userId),
      supabase.from("vat_returns").select("*").eq("user_id", userId),
    ]);

    // Get auth email
    const { data: authData } = await supabase.auth.admin.getUserById(userId);

    const exportData = {
      exportDate: new Date().toISOString(),
      userId,
      email: authData?.user?.email ?? null,
      profile,
      invoices: invoices ?? [],
      clients: clients ?? [],
      receipts: receipts ?? [],
      quotes: quotes ?? [],
      bankTransactions: bankTransactions ?? [],
      hoursLog: hoursLog ?? [],
      trips: trips ?? [],
      assets: assets ?? [],
      subscriptions: subscriptions ?? [],
      taxPayments: taxPayments ?? [],
      vatReturns: vatReturns ?? [],
    };

    await logAdminAction(auth.user.id, "data.export", "user", userId);

    return { error: null, data: JSON.stringify(exportData, null, 2) };
  } catch (e) {
    return { error: sanitizeError(e, { action: "exportUserData" }) };
  }
}

export async function anonymizeUser(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  // Prevent self-anonymization
  if (userId === auth.user.id) {
    return { error: "Je kunt je eigen account niet anonimiseren." };
  }

  try {
    const supabase = createServiceClient();

    // 1. Anonymize profile (keep financial records for 7-year retention)
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: "Geanonimiseerd",
        studio_name: null,
        address: null,
        city: null,
        postal_code: null,
        iban: null,
        bic: null,
        status: "suspended",
      })
      .eq("id", userId);

    if (profileError) return { error: sanitizeError(profileError, { action: "anonymizeUser" }) };

    // 2. Anonymize clients
    await supabase
      .from("clients")
      .update({
        contact_name: "Geanonimiseerd",
        email: null,
        address: null,
        city: null,
        postal_code: null,
      })
      .eq("user_id", userId);

    // 3. Remove bank connections and transactions
    await supabase.from("bank_transactions").delete().eq("user_id", userId);
    await supabase.from("bank_connections").delete().eq("user_id", userId);

    // 4. Remove action feed
    await supabase.from("action_feed").delete().eq("user_id", userId);

    // 5. Remove hours and trips
    await supabase.from("hours_log").delete().eq("user_id", userId);
    await supabase.from("trips").delete().eq("user_id", userId);

    // 6. Update auth email to anonymized
    await supabase.auth.admin.updateUserById(userId, {
      email: `anonymized-${userId.substring(0, 8)}@deleted.vat100.nl`,
      user_metadata: { full_name: "Geanonimiseerd" },
    });

    await logAdminAction(auth.user.id, "user.anonymize", "user", userId);

    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "anonymizeUser" }) };
  }
}

export async function deleteUserAccount(userId: string): Promise<ActionResult> {
  const auth = await requireAdmin();
  if (auth.error !== null) return { error: auth.error };

  if (userId === auth.user.id) {
    return { error: "Je kunt je eigen account niet verwijderen." };
  }

  try {
    const supabase = createServiceClient();

    // Check if user exists
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    if (!profile) return { error: "Gebruiker niet gevonden." };

    // Log before deletion (so we have the audit trail)
    await logAdminAction(auth.user.id, "user.delete", "user", userId, {
      deletedUserName: profile.full_name,
    });

    // Delete auth user (cascades to profile and all related data via FK CASCADE)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) return { error: `Fout bij verwijderen: ${deleteError.message}` };

    return { error: null };
  } catch (e) {
    return { error: sanitizeError(e, { action: "deleteUserAccount" }) };
  }
}
