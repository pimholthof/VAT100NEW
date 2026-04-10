/**
 * Automatische BTW-aangifte Voorbereiding
 *
 * Draait automatisch op de 1e van jan/apr/jul/okt via de agents cron.
 * Genereert een concept BTW-aangifte voor het afgelopen kwartaal en
 * stuurt een herinnering per email + action feed item.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { formatCurrency } from "@/lib/format";

interface VatPrepResult {
  usersProcessed: number;
  returnsCreated: number;
  emailsSent: number;
  errors: string[];
}

/**
 * Check of vandaag de 1e dag van een nieuw kwartaal is.
 */
export function isQuarterStart(date: Date = new Date()): boolean {
  return date.getDate() === 1 && [0, 3, 6, 9].includes(date.getMonth());
}

/**
 * Bepaal het vorige kwartaal op basis van een datum.
 */
export function getPreviousQuarter(date: Date = new Date()): {
  year: number;
  quarter: number;
  startDate: string;
  endDate: string;
} {
  const month = date.getMonth(); // 0-indexed
  const year = date.getFullYear();

  // Huidige kwartaal (1-4)
  const currentQuarter = Math.floor(month / 3) + 1;

  // Vorig kwartaal
  let prevQuarter = currentQuarter - 1;
  let prevYear = year;
  if (prevQuarter === 0) {
    prevQuarter = 4;
    prevYear = year - 1;
  }

  const startMonth = (prevQuarter - 1) * 3; // 0-indexed
  const endMonth = startMonth + 2;

  const startDate = `${prevYear}-${String(startMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(prevYear, endMonth + 1, 0).getDate();
  const endDate = `${prevYear}-${String(endMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  return { year: prevYear, quarter: prevQuarter, startDate, endDate };
}

/**
 * Bereid BTW-aangiftes voor voor alle actieve gebruikers.
 */
export async function prepareVatReturns(): Promise<VatPrepResult> {
  const result: VatPrepResult = {
    usersProcessed: 0,
    returnsCreated: 0,
    emailsSent: 0,
    errors: [],
  };

  const now = new Date();
  if (!isQuarterStart(now)) {
    return result;
  }

  const { year, quarter, startDate, endDate } = getPreviousQuarter(now);
  const supabase = createServiceClient();

  // Haal alle actieve gebruikers op
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, full_name");

  if (usersError || !users) {
    result.errors.push(`Users ophalen mislukt: ${usersError?.message}`);
    return result;
  }

  for (const user of users) {
    try {
      result.usersProcessed++;

      // Check of er al een aangifte bestaat voor dit kwartaal
      const { data: existing } = await supabase
        .from("vat_returns")
        .select("id")
        .eq("user_id", user.id)
        .eq("year", year)
        .eq("quarter", quarter)
        .maybeSingle();

      if (existing) continue; // Al aangemaakt

      // Bereken BTW-bedragen voor het kwartaal
      const [invoicesRes, receiptsRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("subtotal_ex_vat, vat_amount, vat_scheme")
          .eq("user_id", user.id)
          .in("status", ["sent", "paid"])
          .gte("issue_date", startDate)
          .lte("issue_date", endDate),
        supabase
          .from("receipts")
          .select("amount_ex_vat, vat_amount, business_percentage")
          .eq("user_id", user.id)
          .gte("receipt_date", startDate)
          .lte("receipt_date", endDate),
      ]);

      const invoices = invoicesRes.data ?? [];
      const receipts = receiptsRes.data ?? [];

      // Rubriek 1a: binnenlandse leveringen/diensten
      const rubriek1a = invoices
        .filter((i) => i.vat_scheme === "standard" || !i.vat_scheme)
        .reduce((sum, i) => sum + (Number(i.subtotal_ex_vat) || 0), 0);

      // Rubriek 3b: intracommunautaire leveringen
      const rubriek3b = invoices
        .filter((i) => i.vat_scheme === "eu_reverse_charge")
        .reduce((sum, i) => sum + (Number(i.subtotal_ex_vat) || 0), 0);

      // Output BTW (rubriek 5a)
      const outputVat = invoices.reduce(
        (sum, i) => sum + (Number(i.vat_amount) || 0),
        0
      );

      // Input BTW (rubriek 5b)
      const inputVat = receipts.reduce(
        (sum, r) =>
          sum +
          (Number(r.vat_amount) || 0) * ((r.business_percentage ?? 100) / 100),
        0
      );

      const netVat = Math.round((outputVat - inputVat) * 100) / 100;

      // Skip als er geen activiteit was
      if (invoices.length === 0 && receipts.length === 0) continue;

      // Maak concept-aangifte aan
      const { error: insertError } = await supabase
        .from("vat_returns")
        .insert({
          user_id: user.id,
          year,
          quarter,
          status: "draft",
          rubriek_1a: Math.round(rubriek1a * 100) / 100,
          rubriek_3b: Math.round(rubriek3b * 100) / 100,
          rubriek_5a: Math.round(outputVat * 100) / 100,
          rubriek_5b: Math.round(inputVat * 100) / 100,
        });

      if (insertError) {
        result.errors.push(`User ${user.id}: ${insertError.message}`);
        continue;
      }

      result.returnsCreated++;

      // Action feed item
      await supabase.from("action_feed").insert({
        user_id: user.id,
        type: "tax_alert",
        title: `BTW-aangifte Q${quarter} ${year} gereed`,
        description: `Je concept BTW-aangifte voor Q${quarter} ${year} is automatisch voorbereid. Af te dragen: ${formatCurrency(netVat)}. Controleer en dien in voor de deadline.`,
        amount: netVat,
        ai_confidence: 1.0,
      });

      // Email herinnering
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(
          user.id
        );
        if (authUser?.user?.email) {
          const { sendVatReminder } = await import(
            "@/lib/email/send-vat-reminder"
          );
          const emailResult = await sendVatReminder({
            email: authUser.user.email,
            fullName: user.full_name ?? "Ondernemer",
            quarter,
            year,
            netVat,
          });
          if (!emailResult.error) result.emailsSent++;
        }
      } catch {
        // Non-fatal
      }
    } catch (e) {
      result.errors.push(
        `User ${user.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return result;
}
