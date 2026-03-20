"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, OpeningBalance } from "@/lib/types";
import { openingBalanceSchema, validate } from "@/lib/validation";

export async function getOpeningBalance(
  userId: string,
  fiscalYear: number
): Promise<ActionResult<OpeningBalance | null>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("opening_balances")
    .select("*")
    .eq("user_id", userId)
    .eq("fiscal_year", fiscalYear)
    .maybeSingle();

  if (error) return { error: error.message };
  return { error: null, data: data as OpeningBalance | null };
}

export async function upsertOpeningBalance(
  userId: string,
  fiscalYear: number,
  input: unknown
): Promise<ActionResult<OpeningBalance>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const parsed = validate(openingBalanceSchema, input);
  if (parsed.error) return { error: parsed.error };

  // Check authorization: must be own data or advisor for this user
  if (userId !== user.id) {
    const { data: link } = await supabase
      .from("advisor_clients")
      .select("id")
      .eq("advisor_id", user.id)
      .eq("client_user_id", userId)
      .eq("status", "active")
      .limit(1);

    if (!link || link.length === 0) {
      return { error: "Geen toegang tot deze gebruiker." };
    }
  }

  const { data, error } = await supabase
    .from("opening_balances")
    .upsert(
      {
        user_id: userId,
        fiscal_year: fiscalYear,
        ...parsed.data,
        created_by: user.id,
      },
      { onConflict: "user_id,fiscal_year" }
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as OpeningBalance };
}

export async function updateBankBalances(
  fiscalYear: number,
  bankBalanceStart: number,
  bankBalanceEnd: number
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("annual_accounts")
    .update({
      bank_balance_start: bankBalanceStart,
      bank_balance_end: bankBalanceEnd,
    })
    .eq("user_id", user.id)
    .eq("fiscal_year", fiscalYear);

  if (error) return { error: error.message };
  return { error: null };
}
