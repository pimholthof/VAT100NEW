/**
 * Automatische Jaarrekening Generatie (alleen Compleet abonnement)
 *
 * Draait automatisch op 2 januari via de agents cron.
 * Genereert een action feed item met link naar de jaarrekening PDF.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { formatCurrency } from "@/lib/format";

const PLAN_RANKS: Record<string, number> = {
  basis: 0,
  studio: 1,
  compleet: 2,
};

interface AnnualReportResult {
  usersProcessed: number;
  reportsCreated: number;
  upsellsCreated: number;
}

/**
 * Check of vandaag 2 januari is (dag na nieuwjaar).
 */
export function isAnnualReportDay(date: Date = new Date()): boolean {
  return date.getMonth() === 0 && date.getDate() === 2;
}

/**
 * Genereer jaarrekening-notificaties voor alle gebruikers.
 * Compleet: action feed met link naar PDF download
 * Basis/Studio: upsell action feed item
 */
export async function generateAnnualReportNotifications(): Promise<AnnualReportResult> {
  const result: AnnualReportResult = {
    usersProcessed: 0,
    reportsCreated: 0,
    upsellsCreated: 0,
  };

  const now = new Date();
  if (!isAnnualReportDay(now)) return result;

  const previousYear = now.getFullYear() - 1;
  const supabase = createServiceClient();

  // Haal alle gebruikers op met hun plan
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name");

  if (!users) return result;

  for (const user of users) {
    result.usersProcessed++;

    // Check bestaande notificatie
    const { data: existing } = await supabase
      .from("action_feed")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", "tax_alert")
      .ilike("title", `%jaarrekening%${previousYear}%`)
      .maybeSingle();

    if (existing) continue;

    // Bepaal plan-tier
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", user.id)
      .in("status", ["active", "past_due"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const planId = subscription?.plan_id ?? "basis";
    const planRank = PLAN_RANKS[planId] ?? 0;
    const isCompleet = planRank >= 2;

    if (isCompleet) {
      // Haal omzet op voor het vorige jaar
      const { data: yearInvoices } = await supabase
        .from("invoices")
        .select("subtotal_ex_vat")
        .eq("user_id", user.id)
        .in("status", ["sent", "paid"])
        .gte("issue_date", `${previousYear}-01-01`)
        .lte("issue_date", `${previousYear}-12-31`);

      const totalRevenue = (yearInvoices ?? []).reduce(
        (sum, inv) => sum + (Number(inv.subtotal_ex_vat) || 0),
        0
      );

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://vat100.nl";

      await supabase.from("action_feed").insert({
        user_id: user.id,
        type: "tax_alert",
        title: `Jaarrekening ${previousYear} beschikbaar`,
        description: `Je jaarrekening voor ${previousYear} is klaar om te downloaden. Totale omzet: ${formatCurrency(totalRevenue)}. Download de PDF via ${appUrl}/api/jaarrekening/${previousYear}.`,
        amount: totalRevenue,
        ai_confidence: 1.0,
      });

      result.reportsCreated++;
    } else {
      // Upsell voor basis/studio gebruikers
      await supabase.from("action_feed").insert({
        user_id: user.id,
        type: "tax_alert",
        title: `Jaarrekening ${previousYear} — Upgrade naar Compleet`,
        description: `Met het Compleet abonnement wordt je jaarrekening automatisch voorbereid. Upgrade nu voor inzicht in je volledige fiscale positie.`,
        ai_confidence: 1.0,
      });

      result.upsellsCreated++;
    }
  }

  return result;
}
