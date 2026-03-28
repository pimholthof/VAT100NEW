"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, Asset, AssetInput } from "@/lib/types";
import { assetSchema, uuidSchema, validate } from "@/lib/validation";
import {
  calculateYearlyDepreciation,
  type DepreciationRow,
} from "@/lib/tax/dutch-tax-2026";

// ─── CRUD ───

export async function getAssets(): Promise<ActionResult<Asset[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id)
    .order("aanschaf_datum", { ascending: false });

  if (error) return { error: error.message };
  return { error: null, data: (data ?? []) as Asset[] };
}

export async function createAsset(
  input: AssetInput,
): Promise<ActionResult<Asset>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(assetSchema, input);
  if (v.error) return { error: v.error };

  const { data, error } = await supabase
    .from("assets")
    .insert({
      user_id: user.id,
      omschrijving: input.omschrijving,
      aanschaf_datum: input.aanschaf_datum,
      aanschaf_prijs: input.aanschaf_prijs,
      restwaarde: input.restwaarde ?? 0,
      levensduur: input.levensduur ?? 5,
      categorie: input.categorie?.trim() || null,
      receipt_id: input.receipt_id || null,
      notitie: input.notitie?.trim() || null,
      is_verkocht: input.is_verkocht ?? false,
      verkoop_datum: input.verkoop_datum || null,
      verkoop_prijs: input.verkoop_prijs ?? null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

export async function updateAsset(
  id: string,
  input: AssetInput,
): Promise<ActionResult<Asset>> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const v = validate(assetSchema, input);
  if (v.error) return { error: v.error };

  const { data, error } = await supabase
    .from("assets")
    .update({
      omschrijving: input.omschrijving,
      aanschaf_datum: input.aanschaf_datum,
      aanschaf_prijs: input.aanschaf_prijs,
      restwaarde: input.restwaarde ?? 0,
      levensduur: input.levensduur ?? 5,
      categorie: input.categorie?.trim() || null,
      receipt_id: input.receipt_id || null,
      notitie: input.notitie?.trim() || null,
      is_verkocht: input.is_verkocht ?? false,
      verkoop_datum: input.verkoop_datum || null,
      verkoop_prijs: input.verkoop_prijs ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data };
}

export async function deleteAsset(id: string): Promise<ActionResult> {
  const idCheck = uuidSchema.safeParse(id);
  if (!idCheck.success) return { error: "Ongeldig ID." };

  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── Activastaat: afschrijvingsstaat voor een jaar ───

export interface ActivastaatRow extends DepreciationRow {
  categorie: string | null;
  is_verkocht: boolean;
}

export interface Activastaat {
  jaar: number;
  rijen: ActivastaatRow[];
  totaalAanschafprijs: number;
  totaalAfschrijvingDitJaar: number;
  totaalCumulatief: number;
  totaalBoekwaarde: number;
}

export async function getActivastaat(
  year: number,
): Promise<ActionResult<Activastaat>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data: assets, error } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id)
    .order("aanschaf_datum", { ascending: true });

  if (error) return { error: error.message };

  const rijen: ActivastaatRow[] = [];
  let totaalAanschafprijs = 0;
  let totaalAfschrijvingDitJaar = 0;
  let totaalCumulatief = 0;
  let totaalBoekwaarde = 0;

  for (const asset of assets ?? []) {
    const dep = calculateYearlyDepreciation(
      Number(asset.aanschaf_prijs),
      Number(asset.restwaarde) || 0,
      asset.levensduur || 5,
      asset.aanschaf_datum,
      year,
    );

    const row: ActivastaatRow = {
      ...dep,
      id: asset.id,
      omschrijving: asset.omschrijving,
      categorie: asset.categorie,
      is_verkocht: asset.is_verkocht ?? false,
    };

    rijen.push(row);
    totaalAanschafprijs += Number(asset.aanschaf_prijs);
    totaalAfschrijvingDitJaar += dep.jaarAfschrijving;
    totaalCumulatief += dep.totaalAfgeschreven;
    totaalBoekwaarde += dep.boekwaarde;
  }

  const round2 = (v: number) => Math.round(v * 100) / 100;

  return {
    error: null,
    data: {
      jaar: year,
      rijen,
      totaalAanschafprijs: round2(totaalAanschafprijs),
      totaalAfschrijvingDitJaar: round2(totaalAfschrijvingDitJaar),
      totaalCumulatief: round2(totaalCumulatief),
      totaalBoekwaarde: round2(totaalBoekwaarde),
    },
  };
}
