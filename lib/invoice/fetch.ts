import { createClient } from "@/lib/supabase/server";
import type { InvoiceData } from "@/lib/types";

export async function fetchInvoiceData(
  invoiceId: string
): Promise<InvoiceData> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Niet ingelogd");

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) throw new Error("Factuur niet gevonden");

  const [linesResult, clientResult, profileResult] = await Promise.all([
    supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order", { ascending: true }),
    supabase.from("clients").select("*").eq("id", invoice.client_id).single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  if (clientResult.error || !clientResult.data)
    throw new Error("Klant niet gevonden");
  if (profileResult.error || !profileResult.data)
    throw new Error("Profiel niet gevonden");

  return {
    invoice,
    lines: linesResult.data ?? [],
    client: clientResult.data,
    profile: profileResult.data,
  };
}
