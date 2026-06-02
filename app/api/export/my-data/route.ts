import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Tabellen met een directe user_id-kolom die tot de gebruiker behoren.
// Onbekende/afwezige tabellen worden stil overgeslagen — lijst is uitbreidbaar.
const USER_TABLES = [
  "clients",
  "receipts",
  "quotes",
  "vat_returns",
  "tax_payments",
  "bank_transactions",
  "bank_connections",
  "trips",
  "assets",
  "hours_log",
  "categorization_rules",
  "subscriptions",
  "subscription_payments",
  "feedback",
];

/**
 * AVG-dataportabiliteit: alle eigen gegevens van de ingelogde gebruiker als
 * één JSON-download. RLS scoping zorgt dat alleen eigen rijen worden gelezen.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error !== null) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }
  const { supabase, user } = auth;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*, invoice_lines(*)")
    .eq("user_id", user.id);

  const extra: Record<string, unknown> = {};
  for (const table of USER_TABLES) {
    try {
      const { data, error } = await supabase.from(table).select("*").eq("user_id", user.id);
      if (!error) extra[table] = data ?? [];
    } catch {
      // tabel bestaat niet of is niet user-scoped — overslaan
    }
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    account: { id: user.id, email: user.email },
    profile: profile ?? null,
    invoices: invoices ?? [],
    ...extra,
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="vat100-export-${date}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
