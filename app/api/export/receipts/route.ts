import { requireAuth } from "@/lib/supabase/server";
import { sanitizeSupabaseError } from "@/lib/errors";
import { generateCSV, csvResponse } from "@/lib/export/csv";
import { formatDate } from "@/lib/format";
import { NextResponse } from "next/server";

export async function GET() {
  const auth = await requireAuth();
  if (auth.error !== null) return NextResponse.json({ error: auth.error }, { status: 401 });
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .eq("user_id", user.id)
    .order("receipt_date", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: sanitizeSupabaseError(error, {
          area: "exportReceipts",
          userId: user.id,
        }),
      },
      { status: 500 }
    );
  }

  const headers = [
    "Datum",
    "Leverancier",
    "Categorie",
    "Bedrag excl. BTW",
    "BTW",
    "Bedrag incl. BTW",
    "BTW-tarief",
  ];

  const rows = (data ?? []).map((r) => [
    r.receipt_date ? formatDate(r.receipt_date) : "",
    r.vendor_name ?? "",
    r.category ?? "",
    String(r.amount_ex_vat ?? 0),
    String(r.vat_amount ?? 0),
    String(r.amount_inc_vat ?? 0),
    r.vat_rate != null ? `${r.vat_rate}%` : "",
  ]);

  const csv = generateCSV(headers, rows);
  return csvResponse(csv, `bonnen-${new Date().toISOString().slice(0, 10)}.csv`);
}
