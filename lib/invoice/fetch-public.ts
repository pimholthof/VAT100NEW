import { createServiceClient } from "@/lib/supabase/service";
import type { InvoiceData } from "@/lib/types";

export async function fetchInvoiceByToken(
  token: string
): Promise<InvoiceData> {
  const supabase = createServiceClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("share_token", token)
    .single();

  if (invoiceError || !invoice) throw new Error("Factuur niet gevonden");

  const [linesResult, clientResult, profileResult] = await Promise.all([
    supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("sort_order", { ascending: true }),
    supabase.from("clients").select("*").eq("id", invoice.client_id).single(),
    supabase.from("profiles").select("*").eq("id", invoice.user_id).single(),
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
