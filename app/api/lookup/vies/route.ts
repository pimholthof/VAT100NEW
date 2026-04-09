import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { lookupVIES } from "@/lib/services/vies-lookup";

/**
 * GET /api/lookup/vies?vatNumber=NL123456789B01
 *
 * Valideert een BTW-nummer via de EU VIES API.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error !== null) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { user } = auth;

  // Rate limit: 10 verzoeken per minuut per user
  if (await isRateLimited(`vies:${user.id}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Te veel verzoeken. Probeer het over een minuut opnieuw." },
      { status: 429 }
    );
  }

  const vatNumber = request.nextUrl.searchParams.get("vatNumber");
  if (!vatNumber || !vatNumber.trim()) {
    return NextResponse.json(
      { error: "BTW-nummer (vatNumber) is verplicht.", valid: null },
      { status: 400 }
    );
  }

  const result = await lookupVIES(vatNumber);
  return NextResponse.json(result);
}
