import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult, InvoiceData } from "@/lib/types";

export async function fetchInvoiceByToken(
  token: string
): Promise<ActionResult<InvoiceData>> {
  const supabase = createServiceClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("share_token", token)
    .single();

  if (invoiceError || !invoice) return { error: "Factuur niet gevonden" };

  // Controleer of het share token verlopen is
  if (
    invoice.share_token_expires_at &&
    new Date(invoice.share_token_expires_at) < new Date()
  ) {
    return { error: "Deellink is verlopen" };
  }

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
    return { error: "Klant niet gevonden" };
  if (profileResult.error || !profileResult.data)
    return { error: "Profiel niet gevonden" };

  return {
    error: null,
    data: {
      invoice,
      lines: linesResult.data ?? [],
      client: clientResult.data,
      profile: profileResult.data,
    },
  };
}
