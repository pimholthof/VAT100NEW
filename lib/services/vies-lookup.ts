/**
 * VIES (EU VAT Information Exchange System) lookup service.
 * Valideert of een BTW-nummer actief is bij de Europese Commissie.
 *
 * Gebruikt door zowel de /api/lookup/vies route als toekomstige
 * agent-verrijking bij ICP-transacties.
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface VIESResult {
  valid: boolean | null;
  name: string | null;
  address: string | null;
  countryCode: string;
  vatNumber: string;
  error?: string;
}

const VIES_CACHE_DAYS = 7;

/**
 * Valideer een BTW-nummer via de VIES API.
 * Eerste 2 karakters = landcode, rest = nummer.
 */
export async function lookupVIES(vatNumber: string): Promise<VIESResult> {
  const cleaned = vatNumber.trim().replace(/\s/g, "").toUpperCase();

  if (cleaned.length < 4) {
    return {
      valid: null,
      name: null,
      address: null,
      countryCode: "",
      vatNumber: cleaned,
      error: "Ongeldig BTW-nummer formaat",
    };
  }

  const countryCode = cleaned.slice(0, 2);
  const number = cleaned.slice(2);

  // 1. Check cache
  const cached = await getCachedResult(cleaned);
  if (cached) return cached;

  // 2. Call VIES API
  try {
    const response = await fetch(
      "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryCode, vatNumber: number }),
        signal: AbortSignal.timeout(15_000),
      }
    );

    if (!response.ok) {
      return {
        valid: null,
        name: null,
        address: null,
        countryCode,
        vatNumber: number,
        error: "VIES service niet beschikbaar",
      };
    }

    const data = await response.json();

    const result: VIESResult = {
      valid: data.valid ?? null,
      name: data.name || null,
      address: data.address || null,
      countryCode,
      vatNumber: number,
    };

    // 3. Cache result
    await cacheResult(cleaned, result);

    return result;
  } catch {
    return {
      valid: null,
      name: null,
      address: null,
      countryCode,
      vatNumber: number,
      error: "VIES service niet beschikbaar",
    };
  }
}

async function getCachedResult(cacheKey: string): Promise<VIESResult | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("lookup_cache")
      .select("data")
      .eq("cache_type", "vies")
      .eq("cache_key", cacheKey)
      .single();

    if (data?.data) {
      const cached = data.data as VIESResult;
      return cached;
    }
    return null;
  } catch {
    return null;
  }
}

async function cacheResult(cacheKey: string, result: VIESResult): Promise<void> {
  try {
    const supabase = createServiceClient();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + VIES_CACHE_DAYS);

    await supabase.from("lookup_cache").upsert(
      {
        cache_type: "vies",
        cache_key: cacheKey,
        data: result,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "cache_type,cache_key" }
    );
  } catch {
    // Non-fatal
  }
}
