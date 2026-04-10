import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { lookupKvK, lookupKvKByNumber } from "@/lib/services/kvk-lookup";

/**
 * GET /api/lookup/kvk?q=J.+de+Vries+Fotografie
 * GET /api/lookup/kvk?nummer=12345678
 *
 * Zoekt bedrijven op naam of KvK-nummer via het KvK Handelsregister.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error !== null) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { user } = auth;

  // Rate limit: 10 verzoeken per minuut per user
  if (await isRateLimited(`kvk:${user.id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het over een minuut opnieuw.", results: [] },
      { status: 429 }
    );
  }

  const nummer = request.nextUrl.searchParams.get("nummer");
  const q = request.nextUrl.searchParams.get("q");

  if (!nummer && (!q || !q.trim())) {
    return NextResponse.json(
      { error: "Zoekterm (q) of KvK-nummer (nummer) is verplicht.", results: [] },
      { status: 400 }
    );
  }

  if (!process.env.KVK_API_KEY) {
    return NextResponse.json({
      error: "KvK lookup niet geconfigureerd",
      results: [],
    });
  }

  const results = nummer
    ? await lookupKvKByNumber(nummer)
    : await lookupKvK(q!);

  return NextResponse.json({ error: null, results });
}
