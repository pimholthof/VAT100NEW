/**
 * Auto-follow-up verlopen offertes
 *
 * Draait dagelijks via de overdue cron (06:00).
 * Detecteert offertes met status 'sent' waarvan de geldigheid verlopen is,
 * en plaatst een action_feed item met one-click acties.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { getErrorMessage } from "@/lib/utils/errors";

export interface ExpiredQuotesResult {
  processed: number;
  actionsCreated: number;
  errors: string[];
}

export async function processExpiredQuotes(): Promise<ExpiredQuotesResult> {
  const result: ExpiredQuotesResult = { processed: 0, actionsCreated: 0, errors: [] };
  const supabase = createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  const { data: expiredQuotes, error } = await supabase
    .from("quotes")
    .select("id, quote_number, total_inc_vat, valid_until, user_id, client:clients(name)")
    .eq("status", "sent")
    .lt("valid_until", today);

  if (error) {
    result.errors.push(`Ophalen verlopen offertes: ${error.message}`);
    return result;
  }

  for (const quote of expiredQuotes ?? []) {
    try {
      result.processed++;

      const clientName = (quote.client as unknown as { name: string } | null)?.name ?? "onbekend";

      const { error: feedError } = await supabase.from("action_feed").insert({
        user_id: quote.user_id,
        type: "quote_expired",
        title: `Offerte ${quote.quote_number} verlopen`,
        description: `Offerte voor ${clientName} (${new Date(quote.valid_until).toLocaleDateString("nl-NL")}) is verlopen. Verleng of stuur een herinnering.`,
        amount: quote.total_inc_vat,
        ai_confidence: 1.0,
        status: "pending",
        related_quote_id: quote.id,
      });

      if (feedError) {
        result.errors.push(`Quote ${quote.id}: ${feedError.message}`);
        continue;
      }

      await supabase
        .from("quotes")
        .update({ status: "expired" })
        .eq("id", quote.id);

      result.actionsCreated++;
    } catch (e) {
      result.errors.push(`Quote ${quote.id}: ${getErrorMessage(e)}`);
    }
  }

  return result;
}
