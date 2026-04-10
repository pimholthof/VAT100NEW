/**
 * KvK (Kamer van Koophandel) Handelsregister lookup service.
 * Zoekt bedrijven op naam via de KvK API.
 *
 * Gebruikt door zowel de /api/lookup/kvk route als banking actions
 * voor tegenpartij-verrijking bij lage-confidence classificaties.
 */

import { createServiceClient } from "@/lib/supabase/service";

export interface KvKResult {
  kvkNummer: string;
  handelsnaam: string;
  type: string; // "Eenmanszaak", "BV", etc.
  actief: boolean;
  vestigingsplaats: string;
}

const KVK_CACHE_DAYS = 30;

/**
 * Zoek bedrijven op naam via de KvK API.
 * Retourneert een lege array als KVK_API_KEY niet geconfigureerd is (niet-fataal).
 */
export async function lookupKvK(query: string): Promise<KvKResult[]> {
  if (!query.trim()) return [];

  const cacheKey = query.trim().toLowerCase();

  // 1. Check cache
  const cached = await getCachedResults(cacheKey);
  if (cached) return cached;

  // 2. Check API key
  const apiKey = process.env.KVK_API_KEY;
  if (!apiKey) return [];

  // 3. Call KvK API
  try {
    const params = new URLSearchParams({
      handelsnaam: query.trim(),
      type: "hoofdvestiging",
      pagina: "1",
      resultatPerPagina: "5",
    });

    const response = await fetch(
      `https://api.kvk.nl/api/v2/zoeken?${params.toString()}`,
      {
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const resultaten = data.resultaten ?? [];

    const results: KvKResult[] = resultaten.map(
      (r: {
        kvkNummer?: string;
        handelsnaam?: string;
        type?: string;
        actief?: string;
        adres?: { binnenlandsAdres?: { plaats?: string } };
      }) => ({
        kvkNummer: r.kvkNummer ?? "",
        handelsnaam: r.handelsnaam ?? "",
        type: r.type ?? "",
        actief: r.actief !== "Nee",
        vestigingsplaats: r.adres?.binnenlandsAdres?.plaats ?? "",
      })
    );

    // 4. Cache results
    await cacheResults(cacheKey, results);

    return results;
  } catch {
    return [];
  }
}

/**
 * Zoek bedrijf op KvK-nummer (8 cijfers).
 * Retourneert een lege array als KVK_API_KEY niet geconfigureerd is (niet-fataal).
 */
export async function lookupKvKByNumber(kvkNummer: string): Promise<KvKResult[]> {
  if (!kvkNummer.trim() || !/^[0-9]{8}$/.test(kvkNummer.trim())) return [];

  const cacheKey = `nr:${kvkNummer.trim()}`;

  // 1. Check cache
  const cached = await getCachedResults(cacheKey);
  if (cached) return cached;

  // 2. Check API key
  const apiKey = process.env.KVK_API_KEY;
  if (!apiKey) return [];

  // 3. Call KvK API
  try {
    const params = new URLSearchParams({
      kvkNummer: kvkNummer.trim(),
      pagina: "1",
      resultatPerPagina: "1",
    });

    const response = await fetch(
      `https://api.kvk.nl/api/v2/zoeken?${params.toString()}`,
      {
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    const resultaten = data.resultaten ?? [];

    const results: KvKResult[] = resultaten.map(
      (r: {
        kvkNummer?: string;
        handelsnaam?: string;
        type?: string;
        actief?: string;
        adres?: { binnenlandsAdres?: { plaats?: string } };
      }) => ({
        kvkNummer: r.kvkNummer ?? "",
        handelsnaam: r.handelsnaam ?? "",
        type: r.type ?? "",
        actief: r.actief !== "Nee",
        vestigingsplaats: r.adres?.binnenlandsAdres?.plaats ?? "",
      })
    );

    // 4. Cache results
    await cacheResults(cacheKey, results);

    return results;
  } catch {
    return [];
  }
}

async function getCachedResults(cacheKey: string): Promise<KvKResult[] | null> {
  try {
    const supabase = createServiceClient();
    const { data } = await supabase
      .from("lookup_cache")
      .select("data")
      .eq("cache_type", "kvk")
      .eq("cache_key", cacheKey)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (data?.data) return data.data as KvKResult[];
    return null;
  } catch {
    return null;
  }
}

async function cacheResults(cacheKey: string, results: KvKResult[]): Promise<void> {
  try {
    const supabase = createServiceClient();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + KVK_CACHE_DAYS);

    await supabase.from("lookup_cache").upsert(
      {
        cache_type: "kvk",
        cache_key: cacheKey,
        data: results,
        fetched_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "cache_type,cache_key" }
    );
  } catch {
    // Non-fatal: cache miss is acceptable
  }
}
