import { createClient } from "@/lib/supabase/server";
import type { ActionResult, QuoteData } from "@/lib/types";

export async function fetchQuoteData(
  quoteId: string
): Promise<ActionResult<QuoteData>> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: "Niet ingelogd" };

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) return { error: "Offerte niet gevonden" };

  const [linesResult, clientResult, profileResult] = await Promise.all([
    supabase
      .from("quote_lines")
      .select("*")
      .eq("quote_id", quoteId)
      .order("sort_order", { ascending: true }),
    supabase.from("clients").select("*").eq("id", quote.client_id).single(),
    supabase.from("profiles").select("*").eq("id", user.id).single(),
  ]);

  if (clientResult.error || !clientResult.data)
    return { error: "Klant niet gevonden" };
  if (profileResult.error || !profileResult.data)
    return { error: "Profiel niet gevonden" };

  return {
    error: null,
    data: {
      quote,
      lines: linesResult.data ?? [],
      client: clientResult.data,
      profile: profileResult.data,
    },
  };
}
