import { requireAuth } from "@/lib/supabase/server";
import { sanitizeSupabaseError } from "@/lib/errors";
import { generateCSV, csvResponse } from "@/lib/export/csv";
import { formatDate } from "@/lib/format";
import { isRateLimited } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error !== null) return NextResponse.json({ error: auth.error }, { status: 401 });
  const { supabase, user } = auth;

  if (await isRateLimited(`export:${user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Te veel exports. Probeer het later opnieuw." }, { status: 429 });
  }

  const { data, error } = await supabase
    .from("invoices")
    .select("*, client:clients(name)")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: sanitizeSupabaseError(error, {
          area: "exportInvoices",
          userId: user.id,
        }),
      },
      { status: 500 }
    );
  }

  const headers = [
    "Factuurnummer",
    "Klant",
    "Datum",
    "Vervaldatum",
    "Status",
    "Subtotaal excl. BTW",
    "BTW",
    "Totaal incl. BTW",
    "BTW-tarief",
  ];

  const rows = (data ?? []).map((inv) => [
    inv.invoice_number ?? "",
    (inv.client as { name: string } | null)?.name ?? "",
    inv.issue_date ? formatDate(inv.issue_date) : "",
    inv.due_date ? formatDate(inv.due_date) : "",
    inv.status ?? "",
    String(inv.subtotal_ex_vat ?? 0),
    String(inv.vat_amount ?? 0),
    String(inv.total_inc_vat ?? 0),
    `${inv.vat_rate ?? 21}%`,
  ]);

  const csv = generateCSV(headers, rows);
  return csvResponse(csv, `facturen-${new Date().toISOString().slice(0, 10)}.csv`);
}
