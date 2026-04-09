import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { lookupKvK } from "@/lib/services/kvk-lookup";

/**
 * GET /api/lookup/kvk?q=J.+de+Vries+Fotografie
 *
 * Zoekt bedrijven op naam via het KvK Handelsregister.
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

  const q = request.nextUrl.searchParams.get("q");
  if (!q || !q.trim()) {
    return NextResponse.json(
      { error: "Zoekterm (q) is verplicht.", results: [] },
      { status: 400 }
    );
  }

  const results = await lookupKvK(q);

  if (!process.env.KVK_API_KEY) {
    return NextResponse.json({
      error: "KvK lookup niet geconfigureerd",
      results: [],
    });
  }

  return NextResponse.json({ error: null, results });
}
