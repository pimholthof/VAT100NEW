"use server";

import { requireAuth } from "@/lib/supabase/server";
import type { ActionResult, Asset, AssetWithDepreciation } from "@/lib/types";
import { assetSchema, validate } from "@/lib/validation";

function calculateDepreciation(asset: Asset): AssetWithDepreciation {
  const depreciableAmount = asset.acquisition_cost - asset.residual_value;
  const monthlyDepreciation =
    asset.useful_life_months > 0
      ? Math.round((depreciableAmount / asset.useful_life_months) * 100) / 100
      : 0;

  const acquisitionDate = new Date(asset.acquisition_date);
  const now = new Date();
  const monthsElapsed =
    (now.getFullYear() - acquisitionDate.getFullYear()) * 12 +
    (now.getMonth() - acquisitionDate.getMonth());

  const effectiveMonths = Math.max(0, Math.min(monthsElapsed, asset.useful_life_months));
  const totalDepreciated = Math.round(monthlyDepreciation * effectiveMonths * 100) / 100;
  const bookValue = Math.max(asset.residual_value, asset.acquisition_cost - totalDepreciated);

  return {
    ...asset,
    monthly_depreciation: monthlyDepreciation,
    total_depreciated: totalDepreciated,
    book_value: Math.round(bookValue * 100) / 100,
  };
}

export async function getAssets(): Promise<ActionResult<AssetWithDepreciation[]>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("user_id", user.id)
    .order("acquisition_date", { ascending: false });

  if (error) return { error: error.message };

  const assets = (data ?? []) as Asset[];
  return { error: null, data: assets.map(calculateDepreciation) };
}

export async function getAsset(id: string): Promise<ActionResult<AssetWithDepreciation>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("assets")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error) return { error: error.message };
  return { error: null, data: calculateDepreciation(data as Asset) };
}

export async function createAsset(input: unknown): Promise<ActionResult<Asset>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const parsed = validate(assetSchema, input);
  if (parsed.error) return { error: parsed.error };

  const { data, error } = await supabase
    .from("assets")
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as Asset };
}

export async function updateAsset(
  id: string,
  input: unknown
): Promise<ActionResult<Asset>> {
  const auth = await requireAuth();
  if (auth.error !== null) return { error: auth.error };
  const { supabase, user } = auth;

  const parsed = validate(assetSchema, input);
  if (parsed.error) return { error: parsed.error };

  const { data, error } = await supabase
    .from("assets")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, data: data as Asset };
}

export async function deleteAsset(id: string): Promise<ActionResult> {
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
