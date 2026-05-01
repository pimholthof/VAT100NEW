/**
 * Automatische BTW-aangifte Voorbereiding
 *
 * Draait automatisch op de 1e van jan/apr/jul/okt via de agents cron.
 * Genereert een concept BTW-aangifte voor het afgelopen kwartaal en
 * stuurt een herinnering per email + action feed item.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { getErrorMessage } from "@/lib/utils/errors";
import { formatCurrency } from "@/lib/format";
import { calculateBtwRubrieken } from "@/lib/tax/btw-rubrieken";

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

      // Bereken BTW-bedragen voor het kwartaal — gedeelde calculator zodat
      // cron en UI nooit driften.
      const [invoicesRes, receiptsRes] = await Promise.all([
        supabase
          .from("invoices")
          .select(
            "subtotal_ex_vat, vat_amount, vat_rate, vat_scheme, is_credit_note, invoice_lines(amount, vat_rate)",
          )
          .eq("user_id", user.id)
          .in("status", ["sent", "paid"])
          .gte("issue_date", startDate)
          .lte("issue_date", endDate),
        supabase
          .from("receipts")
          .select("vat_amount, business_percentage")
          .eq("user_id", user.id)
          .gte("receipt_date", startDate)
          .lte("receipt_date", endDate)
          .is("archived_at", null),
      ]);

      const invoices = invoicesRes.data ?? [];
      const receipts = receiptsRes.data ?? [];

      // Skip als er geen activiteit was
      if (invoices.length === 0 && receipts.length === 0) continue;

      const r = calculateBtwRubrieken(invoices, receipts);
      const netVat = r.rubriek5g;

      // Maak concept-aangifte aan
      const { error: insertError } = await supabase
        .from("vat_returns")
        .insert({
          user_id: user.id,
          year,
          quarter,
          status: "draft",
          rubriek_1a_omzet: r["1a"].omzet,
          rubriek_1a_btw: r["1a"].btw,
          rubriek_1b_omzet: r["1b"].omzet,
          rubriek_1b_btw: r["1b"].btw,
          rubriek_1c_omzet: r["1c"].omzet,
          rubriek_1c_btw: r["1c"].btw,
          rubriek_2a_omzet: r["2a"].omzet,
          rubriek_2a_btw: r["2a"].btw,
          rubriek_3b_omzet: r["3b"].omzet,
          rubriek_3b_btw: r["3b"].btw,
          rubriek_4a_omzet: r["4a"].omzet,
          rubriek_4a_btw: r["4a"].btw,
          rubriek_4b_omzet: r["4b"].omzet,
          rubriek_4b_btw: r["4b"].btw,
          rubriek_5b: r.voorbelasting,
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
        `User ${user.id}: ${getErrorMessage(e)}`
      );
    }
  }

  return result;
}
