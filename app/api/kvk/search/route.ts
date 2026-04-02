import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";

export interface KvkSearchResult {
  kvkNummer: string;
  naam: string;
  straatnaam: string | null;
  huisnummer: string | null;
  postcode: string | null;
  plaats: string | null;
  type: string | null;
}

// Production: use KVK_API_KEY env var
// Development/test: use the free KVK test API with their public test key
const KVK_API_KEY = process.env.KVK_API_KEY;
const IS_PRODUCTION = !!KVK_API_KEY;
const KVK_BASE_URL = IS_PRODUCTION
  ? "https://api.kvk.nl/api/v2/zoeken"
  : "https://api.kvk.nl/test/api/v2/zoeken";
const KVK_TEST_KEY = "l7xx1f2691f2520d487b902f4e0b57a0b197";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error !== null) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q");
  if (!query || query.trim().length < 2) {
    return NextResponse.json({ error: "Zoekterm te kort" }, { status: 400 });
  }

  try {
    const trimmed = query.trim();
    const params = new URLSearchParams();

    // If the query is exactly 8 digits, search by KVK number
    if (/^\d{8}$/.test(trimmed)) {
      params.set("kvkNummer", trimmed);
    } else {
      params.set("naam", trimmed);
    }

    const apiKey = KVK_API_KEY || KVK_TEST_KEY;

    const response = await fetch(`${KVK_BASE_URL}?${params.toString()}`, {
      headers: {
        apikey: apiKey,
        Accept: "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("KVK API error:", response.status, text);
      return NextResponse.json(
        { error: "KVK zoekopdracht mislukt. Controleer de API-sleutel." },
        { status: 502 }
      );
    }

    const data = await response.json();

    // Map results — KVK v2 uses `naam` and nested `adres` with `binnenlandsAdres`
    const results: KvkSearchResult[] = (data.resultaten ?? [])
      .slice(0, 10)
      .map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => {
          const adres = r.adres?.binnenlandsAdres ?? r.adres ?? {};
          return {
            kvkNummer: r.kvkNummer ?? "",
            naam: r.naam ?? r.handelsnaam ?? "",
            straatnaam: adres.straatnaam ?? null,
            huisnummer: adres.huisnummer != null ? String(adres.huisnummer) : null,
            postcode: adres.postcode ?? null,
            plaats: adres.plaats ?? r.adres?.plaats ?? null,
            type: r.type ?? null,
          };
        }
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
