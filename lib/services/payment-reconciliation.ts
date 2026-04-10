/**
 * Automatische Betalingsreconciliatie
 *
 * Koppelt inkomende banktransacties aan openstaande facturen op basis van:
 * 1. Exact bedrag match (total_inc_vat)
 * 2. Factuurnummer of klantnaam in transactie-omschrijving
 *
 * Dit vervangt de noodzaak voor AI-gebaseerde matching bij duidelijke matches
 * en verlaagt zo de Anthropic API-kosten.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface ReconciliationResult {
  matched: number;
  matches: Array<{
    transactionId: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    matchType: "exact_amount_and_number" | "exact_amount_and_name";
  }>;
}

/**
 * Zoekt openstaande facturen die matchen met recente banktransacties.
 * Markeert gematchte facturen automatisch als betaald.
 */
export async function autoReconcilePayments(
  userId: string,
  supabase: SupabaseClient
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = { matched: 0, matches: [] };

  // 1. Haal ongematchte inkomende transacties op (positief bedrag, geen categorie "omzet" al)
  const { data: transactions } = await supabase
    .from("bank_transactions")
    .select("id, amount, description, counterpart_name, booking_date")
    .eq("user_id", userId)
    .gt("amount", 0)
    .is("matched_invoice_id", null)
    .order("booking_date", { ascending: false })
    .limit(100);

  if (!transactions || transactions.length === 0) return result;

  // 2. Haal openstaande facturen op (sent of overdue)
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_inc_vat, client_id, status, clients(name)")
    .eq("user_id", userId)
    .in("status", ["sent", "overdue"]);

  if (!invoices || invoices.length === 0) return result;

  // 3. Match transacties tegen facturen
  for (const tx of transactions) {
    const txAmount = Math.round(Number(tx.amount) * 100);
    const txDesc = (tx.description ?? "").toLowerCase();
    const txCounterpart = (tx.counterpart_name ?? "").toLowerCase();

    for (const inv of invoices) {
      const invAmount = Math.round(Number(inv.total_inc_vat) * 100);
      const invNumber = (inv.invoice_number ?? "").toLowerCase();
      const clientName = (
        (inv.clients as unknown as { name: string })?.name ?? ""
      ).toLowerCase();

      // Bedrag moet exact matchen (op centen niveau)
      if (txAmount !== invAmount) continue;

      // Check of factuurnummer of klantnaam in omschrijving/tegenpartij voorkomt
      let matchType: ReconciliationResult["matches"][0]["matchType"] | null =
        null;

      if (
        invNumber &&
        (txDesc.includes(invNumber) || txCounterpart.includes(invNumber))
      ) {
        matchType = "exact_amount_and_number";
      } else if (
        clientName.length >= 3 &&
        (txDesc.includes(clientName) || txCounterpart.includes(clientName))
      ) {
        matchType = "exact_amount_and_name";
      }

      if (!matchType) continue;

      // 4. Markeer factuur als betaald
      const { error: updateError } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          payment_method: "bank_transfer",
        })
        .eq("id", inv.id)
        .eq("user_id", userId)
        .in("status", ["sent", "overdue"]);

      if (updateError) continue;

      // 5. Koppel transactie aan factuur
      await supabase
        .from("bank_transactions")
        .update({ matched_invoice_id: inv.id, category: "omzet" })
        .eq("id", tx.id)
        .eq("user_id", userId);

      result.matches.push({
        transactionId: tx.id,
        invoiceId: inv.id,
        invoiceNumber: inv.invoice_number,
        amount: Number(tx.amount),
        matchType,
      });
      result.matched++;

      // Verwijder deze factuur uit de lijst zodat ze niet dubbel gematcht wordt
      const invIndex = invoices.indexOf(inv);
      if (invIndex !== -1) invoices.splice(invIndex, 1);

      break; // Ga naar volgende transactie
    }
  }

  return result;
}
