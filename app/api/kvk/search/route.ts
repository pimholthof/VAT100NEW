import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";

export interface KvkSearchResult {
  kvkNummer: string;
  handelsnaam: string;
  straatnaam: string | null;
  huisnummer: string | null;
  postcode: string | null;
  plaats: string | null;
  type: string | null;
}

const KVK_API_KEY = process.env.KVK_API_KEY;
const KVK_BASE_URL = KVK_API_KEY
  ? "https://api.kvk.nl/api/v1/zoeken"
  : "https://api.kvk.nl/test/api/v1/zoeken";

export async function GET(request: NextRequest) {
  // Require authentication
  const auth = await requireAuth();
  if (auth.error !== null) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: "Zoekterm te kort" }, { status: 400 });
  }

  try {
    const params = new URLSearchParams({ handelsnaam: query.trim() });

    // If the query looks like a KVK number (all digits), search by number instead
    if (/^\d{8}$/.test(query.trim())) {
      params.delete("handelsnaam");
      params.set("kvkNummer", query.trim());
    }

    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (KVK_API_KEY) {
      headers["apikey"] = KVK_API_KEY;
    }

    const response = await fetch(`${KVK_BASE_URL}?${params.toString()}`, {
      headers,
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("KVK API error:", response.status, text);
      return NextResponse.json(
        { error: "KVK zoekopdracht mislukt" },
        { status: 502 }
      );
    }

    const data = await response.json();

    const results: KvkSearchResult[] = (data.resultaten ?? [])
      .slice(0, 10)
      .map(
        (r: {
          kvkNummer?: string;
          handelsnaam?: string;
          adres?: {
            binnenlandsAdres?: {
              straatnaam?: string;
              huisnummer?: number;
              postcode?: string;
              plaats?: string;
            };
          };
          type?: string;
        }) => ({
          kvkNummer: r.kvkNummer ?? "",
          handelsnaam: r.handelsnaam ?? "",
          straatnaam: r.adres?.binnenlandsAdres?.straatnaam ?? null,
          huisnummer: r.adres?.binnenlandsAdres?.huisnummer != null
            ? String(r.adres.binnenlandsAdres.huisnummer)
            : null,
          postcode: r.adres?.binnenlandsAdres?.postcode ?? null,
          plaats: r.adres?.binnenlandsAdres?.plaats ?? null,
          type: r.type ?? null,
        })
      );

    return NextResponse.json({ results });
  } catch (err) {
    console.error("KVK search failed:", err);
    return NextResponse.json(
      { error: "KVK zoekopdracht mislukt" },
      { status: 500 }
    );
  }
}
