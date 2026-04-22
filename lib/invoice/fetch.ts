import { createClient } from "@/lib/supabase/server";
import type { ActionResult, InvoiceData } from "@/lib/types";

export async function fetchInvoiceData(
  invoiceId: string
): Promise<ActionResult<InvoiceData>> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Niet ingelogd" };

  // Scope to the authenticated user as defense-in-depth. RLS should already
  // block cross-tenant access, but an explicit user_id filter means we fail
  // closed even if a policy regresses.
  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (invoiceError || !invoice) return { error: "Factuur niet gevonden" };

  const [linesResult, clientResult, profileResult] = await Promise.all([
    supabase
      .from("invoice_lines")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("clients")
      .select("*")
      .eq("id", invoice.client_id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
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
