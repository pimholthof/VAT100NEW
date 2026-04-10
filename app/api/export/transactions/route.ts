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
    .from("bank_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("booking_date", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: sanitizeSupabaseError(error, {
          area: "exportTransactions",
          userId: user.id,
        }),
      },
      { status: 500 }
    );
  }

  const headers = [
    "Datum",
    "Bedrag",
    "Valuta",
    "Omschrijving",
    "Tegenpartij",
    "Categorie",
    "Inkomst",
  ];

  const rows = (data ?? []).map((tx) => [
    tx.booking_date ? formatDate(tx.booking_date) : "",
    String(tx.amount ?? 0),
    tx.currency ?? "EUR",
    tx.description ?? "",
    tx.counterpart_name ?? "",
    tx.category ?? "",
    tx.is_income ? "Ja" : "Nee",
  ]);

  const csv = generateCSV(headers, rows);
  return csvResponse(csv, `transacties-${new Date().toISOString().slice(0, 10)}.csv`);
}
