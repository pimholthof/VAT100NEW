"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, OpeningBalance, OpeningBalanceInput } from "@/lib/types";
import { openingBalanceSchema, validate } from "@/lib/validation";

export async function getOpeningBalance(
  year: number,
): Promise<ActionResult<OpeningBalance | null>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("opening_balances")
    .select("*")
    .eq("user_id", user.id)
    .eq("year", year)
    .maybeSingle();

  if (error) return { error: error.message };
  return { error: null, data: (data as OpeningBalance) ?? null };
}

export async function saveOpeningBalance(
  year: number,
  input: OpeningBalanceInput,
): Promise<ActionResult<OpeningBalance>> {
  if (!Number.isInteger(year) || year < 2015 || year > new Date().getFullYear()) {
    return { error: "Ongeldig jaar." };
  }

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(openingBalanceSchema, input);
  if (v.error) return { error: v.error };

  const { data, error } = await supabase
    .from("opening_balances")
    .upsert(
      {
        user_id: user.id,
        year,
        ...input,
      },
      { onConflict: "user_id,year" },
    )
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

export async function deleteOpeningBalance(year: number): Promise<ActionResult> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("opening_balances")
    .delete()
    .eq("user_id", user.id)
    .eq("year", year);

  if (error) return { error: error.message };
  return { error: null };
}
