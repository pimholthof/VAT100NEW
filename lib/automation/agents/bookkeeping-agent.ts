import { createServiceClient } from "@/lib/supabase/service";
import { autoBookInvoice, autoBookReceipt } from "@/features/ledger/actions";
import { Agent, SystemEventRow } from "../types";

type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

interface BankTransaction {
  id: string;
  amount: number;
  description: string | null;
  date: string;
}

interface InvoiceMatch {
  id: string;
  invoice_number: string;
  total_inc_vat: number;
  client: { name: string }[] | null;
}

interface ReceiptMatch {
  id: string;
  vendor_name: string | null;
  amount_inc_vat: number;
  receipt_date: string;
}

/**
 * Agent 7: Automatische Boekhoudregels
 *
 * Koppelt automatisch banktransacties aan facturen en bonnen.
 * Genereert boekhoudsuggesties en categoriseert transacties.
 */
export const bookkeepingAgent: Agent = {
  name: "Boekhoud Agent",
  description: "Koppelt banktransacties aan facturen/bonnen en genereert boekhoudregels.",
  targetEvents: ["transaction.imported", "invoice.paid", "receipt.uploaded", "system.daily_reconciliation"],

  run: async (event: SystemEventRow) => {
    const supabase = createServiceClient();
    const userId = event.user_id;
    if (!userId) return false;

    try {
      let matchCount = 0;
      let suggestionCount = 0;

      // Verwerk verschillende event types
      if (event.event_type === "transaction.imported") {
        const transactionId = typeof event.payload?.transactionId === 'string' ? event.payload.transactionId : null;
        if (transactionId) matchCount = await matchTransaction(supabase, transactionId, userId);
      } else if (event.event_type === "invoice.paid") {
        const invoiceId = typeof event.payload?.invoiceId === 'string' ? event.payload.invoiceId : null;
        if (invoiceId) matchCount = await matchInvoicePayment(supabase, invoiceId, userId);
      } else if (event.event_type === "receipt.uploaded") {
        const receiptId = typeof event.payload?.receiptId === 'string' ? event.payload.receiptId : null;
        if (receiptId) matchCount = await matchReceiptPayment(supabase, receiptId, userId);
      } else if (event.event_type === "system.daily_reconciliation") {
        const result = await performDailyReconciliation(supabase, userId);
        matchCount = result.matches;
        suggestionCount = result.suggestions;
      }

      // Stuur notificatie bij significante matches
      if (matchCount > 0 || suggestionCount > 0) {
        await sendBookkeepingNotification(supabase, userId, matchCount, suggestionCount);
      }

      return true;
    } catch (err) {
      console.error(`[Bookkeeping Agent] Error:`, err);
      return false;
    }
  }
};

// ─── Transactie matching functies ───

async function matchTransaction(supabase: SupabaseServiceClient, transactionId: string, userId: string): Promise<number> {
  const { data: transaction, error } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();

  if (error || !transaction) return 0;

  let matches = 0;

  // Probeer te matchen met facturen
  const invoiceMatch = await matchSingleWithInvoices(supabase, transaction, userId);
  if (invoiceMatch) {
    matches++;
    await linkTransactionToInvoice(supabase, transaction.id, invoiceMatch.invoiceId, invoiceMatch.confidence);
  }

  // Probeer te matchen met bonnen
  const receiptMatch = await matchSingleWithReceipts(supabase, transaction, userId);
  if (receiptMatch) {
    matches++;
    await linkTransactionToReceipt(supabase, transaction.id, receiptMatch.receiptId, receiptMatch.confidence);
  }

  return matches;
}

async function matchInvoicePayment(supabase: SupabaseServiceClient, invoiceId: string, userId: string): Promise<number> {
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_inc_vat, client:clients(name)")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (error || !invoice) return 0;

  // Zoek naar transactie binnen 7 dagen van factuurdatum
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: transactions } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("user_id", userId)
    .is("linked_invoice_id", null)
    .gte("date", sevenDaysAgo.toISOString())
    .lte("amount", invoice.total_inc_vat * 1.01)
    .gte("amount", invoice.total_inc_vat * 0.99);

  if (!transactions || transactions.length === 0) return 0;

  // Best match op basis van bedrag en omschrijving
  const bestMatch = transactions.reduce((best, current) => {
    const currentScore = calculateMatchScore(current, invoice);
    const bestScore = best ? calculateMatchScore(best, invoice) : 0;
    return currentScore > bestScore ? current : best;
  }, null as BankTransaction | null);

  if (bestMatch && calculateMatchScore(bestMatch, invoice) > 0.8) {
    await linkTransactionToInvoice(supabase, bestMatch.id, invoice.id, 0.9);
    return 1;
  }

  return 0;
}

async function matchReceiptPayment(supabase: SupabaseServiceClient, receiptId: string, userId: string): Promise<number> {
  const { data: receipt, error } = await supabase
    .from("receipts")
    .select("id, vendor_name, amount_inc_vat, receipt_date")
    .eq("id", receiptId)
    .eq("user_id", userId)
    .single();

  if (error || !receipt) return 0;

  // Zoek naar transactie binnen 3 dagen van bondatum
  const threeDaysAgo = new Date(receipt.receipt_date);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysLater = new Date(receipt.receipt_date);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const { data: transactions } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("user_id", userId)
    .is("linked_receipt_id", null)
    .gte("date", threeDaysAgo.toISOString())
    .lte("date", threeDaysLater.toISOString())
    .lte("amount", receipt.amount_inc_vat * 1.01)
    .gte("amount", receipt.amount_inc_vat * 0.99);

  if (!transactions || transactions.length === 0) return 0;

  // Best match op basis van bedrag en vendor naam
  const bestMatch = transactions.reduce((best, current) => {
    const currentScore = calculateReceiptMatchScore(current, receipt);
    const bestScore = best ? calculateReceiptMatchScore(best, receipt) : 0;
    return currentScore > bestScore ? current : best;
  }, null as BankTransaction | null);

  if (bestMatch && calculateReceiptMatchScore(bestMatch, receipt) > 0.7) {
    await linkTransactionToReceipt(supabase, bestMatch.id, receipt.id, 0.8);
    return 1;
  }

  return 0;
}

/**
 * Dagelijkse reconciliatie: batch-fetch alle openstaande facturen en bonnen
 * in plaats van per-transactie queries (voorkomt N+1 probleem).
 */
async function performDailyReconciliation(supabase: SupabaseServiceClient, userId: string): Promise<{ matches: number; suggestions: number }> {
  // Haal ongeëncategoriseerde transacties van laatste 30 dagen
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: transactions } = await supabase
    .from("bank_transactions")
    .select("*")
    .eq("user_id", userId)
    .is("linked_invoice_id", null)
    .is("linked_receipt_id", null)
    .is("category", null)
    .gte("date", thirtyDaysAgo.toISOString());

  if (!transactions || transactions.length === 0) return { matches: 0, suggestions: 0 };

  // Batch-fetch: alle openstaande facturen en bonnen in 2 queries
  const [{ data: openInvoices }, { data: openReceipts }] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, total_inc_vat, client:clients(name)")
      .eq("user_id", userId)
      .eq("status", "sent")
      .is("linked_transaction_id", null),
    supabase
      .from("receipts")
      .select("id, vendor_name, amount_inc_vat, receipt_date")
      .eq("user_id", userId)
      .is("linked_transaction_id", null)
      .gte("receipt_date", thirtyDaysAgo.toISOString()),
  ]);

  let matches = 0;
  let suggestions = 0;

  // Track welke facturen/bonnen al gematcht zijn om dubbele koppelingen te voorkomen
  const matchedInvoiceIds = new Set<string>();
  const matchedReceiptIds = new Set<string>();

  for (const transaction of transactions) {
    // Match met facturen (in-memory)
    const invoiceMatch = matchTransactionToInvoicesInMemory(transaction, openInvoices ?? [], matchedInvoiceIds);
    if (invoiceMatch) {
      matches++;
      matchedInvoiceIds.add(invoiceMatch.invoiceId);
      await linkTransactionToInvoice(supabase, transaction.id, invoiceMatch.invoiceId, invoiceMatch.confidence);
      continue;
    }

    // Match met bonnen (in-memory)
    const receiptMatch = matchTransactionToReceiptsInMemory(transaction, openReceipts ?? [], matchedReceiptIds);
    if (receiptMatch) {
      matches++;
      matchedReceiptIds.add(receiptMatch.receiptId);
      await linkTransactionToReceipt(supabase, transaction.id, receiptMatch.receiptId, receiptMatch.confidence);
      continue;
    }

    // Genereer categorisatie suggestie (pure logica, geen DB query)
    const category = suggestCategory(transaction);
    if (category) {
      suggestions++;
      await storeCategorySuggestion(supabase, transaction.id, category, userId);
    }
  }

  return { matches, suggestions };
}

// ─── In-memory matching voor batch-reconciliatie ───

function matchTransactionToInvoicesInMemory(
  transaction: BankTransaction,
  invoices: InvoiceMatch[],
  excludeIds: Set<string>
): { invoiceId: string; confidence: number } | null {
  const candidates = invoices.filter(inv =>
    !excludeIds.has(inv.id) &&
    Math.abs(transaction.amount - inv.total_inc_vat) / inv.total_inc_vat <= 0.01
  );

  for (const invoice of candidates) {
    const score = calculateMatchScore(transaction, invoice);
    if (score > 0.8) {
      return { invoiceId: invoice.id, confidence: score };
    }
  }

  return null;
}

function matchTransactionToReceiptsInMemory(
  transaction: BankTransaction,
  receipts: ReceiptMatch[],
  excludeIds: Set<string>
): { receiptId: string; confidence: number } | null {
  const transactionDate = new Date(transaction.date).getTime();
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

  const candidates = receipts.filter(r => {
    if (excludeIds.has(r.id)) return false;
    const receiptDate = new Date(r.receipt_date).getTime();
    const withinDate = Math.abs(transactionDate - receiptDate) <= threeDaysMs;
    const withinAmount = Math.abs(transaction.amount - r.amount_inc_vat) / r.amount_inc_vat <= 0.01;
    return withinDate && withinAmount;
  });

  for (const receipt of candidates) {
    const score = calculateReceiptMatchScore(transaction, receipt);
    if (score > 0.7) {
      return { receiptId: receipt.id, confidence: score };
    }
  }

  return null;
}

// ─── Single-transaction matching (voor event-driven calls) ───

async function matchSingleWithInvoices(supabase: SupabaseServiceClient, transaction: BankTransaction, userId: string): Promise<{ invoiceId: string; confidence: number } | null> {
  // Zoek facturen met vergelijkbaar bedrag
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, total_inc_vat, client:clients(name)")
    .eq("user_id", userId)
    .eq("status", "sent")
    .is("linked_transaction_id", null)
    .lte("total_inc_vat", transaction.amount * 1.01)
    .gte("total_inc_vat", transaction.amount * 0.99);

  if (!invoices || invoices.length === 0) return null;

  for (const invoice of invoices) {
    const score = calculateMatchScore(transaction, invoice);
    if (score > 0.8) {
      return { invoiceId: invoice.id, confidence: score };
    }
  }

  return null;
}

async function matchSingleWithReceipts(supabase: SupabaseServiceClient, transaction: BankTransaction, userId: string): Promise<{ receiptId: string; confidence: number } | null> {
  // Zoek bonnen binnen 3 dagen met vergelijkbaar bedrag
  const threeDaysAgo = new Date(transaction.date);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeDaysLater = new Date(transaction.date);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);

  const { data: receipts } = await supabase
    .from("receipts")
    .select("id, vendor_name, amount_inc_vat, receipt_date")
    .eq("user_id", userId)
    .is("linked_transaction_id", null)
    .gte("receipt_date", threeDaysAgo.toISOString())
    .lte("receipt_date", threeDaysLater.toISOString())
    .lte("amount_inc_vat", transaction.amount * 1.01)
    .gte("amount_inc_vat", transaction.amount * 0.99);

  if (!receipts || receipts.length === 0) return null;

  for (const receipt of receipts) {
    const score = calculateReceiptMatchScore(transaction, receipt);
    if (score > 0.7) {
      return { receiptId: receipt.id, confidence: score };
    }
  }

  return null;
}

// ─── Matching algoritmes ───

function calculateMatchScore(transaction: BankTransaction, invoice: InvoiceMatch): number {
  let score = 0;

  // Bedrag overeenkomst (max 0.6)
  const amountDiff = Math.abs(transaction.amount - invoice.total_inc_vat) / invoice.total_inc_vat;
  score += Math.max(0, 0.6 - amountDiff * 2);

  // Omschrijving bevat factuurnummer of klantnaam (max 0.3)
  const description = (transaction.description || "").toLowerCase();
  if (description.includes(invoice.invoice_number.toLowerCase())) {
    score += 0.3;
  } else if (invoice.client?.[0]?.name && description.includes(invoice.client[0].name.toLowerCase())) {
    score += 0.2;
  }

  // Tijdsdichtheid (max 0.1)
  const transactionDate = new Date(transaction.date);
  const expectedDate = new Date();
  const daysDiff = Math.abs((transactionDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 7) {
    score += 0.1 * (1 - daysDiff / 7);
  }

  return Math.min(1, score);
}

function calculateReceiptMatchScore(transaction: BankTransaction, receipt: ReceiptMatch): number {
  let score = 0;

  // Bedrag overeenkomst (max 0.5)
  const amountDiff = Math.abs(transaction.amount - receipt.amount_inc_vat) / receipt.amount_inc_vat;
  score += Math.max(0, 0.5 - amountDiff * 2);

  // Vendor naam in omschrijving (max 0.3)
  const description = (transaction.description || "").toLowerCase();
  const vendor = (receipt.vendor_name || "").toLowerCase();
  if (vendor && description.includes(vendor)) {
    score += 0.3;
  }

  // Datum overeenkomst (max 0.2)
  const transactionDate = new Date(transaction.date);
  const receiptDate = new Date(receipt.receipt_date);
  const daysDiff = Math.abs((transactionDate.getTime() - receiptDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff <= 3) {
    score += 0.2 * (1 - daysDiff / 3);
  }

  return Math.min(1, score);
}

// ─── Categorisatie ───

function suggestCategory(transaction: BankTransaction): string | null {
  const description = (transaction.description || "").toLowerCase();
  const amount = Math.abs(transaction.amount);

  // Inkomsten
  if (transaction.amount > 0) {
    if (description.includes("factuur") || description.includes("invoice")) {
      return "Omzet";
    }
    if (description.includes("incasso") || description.includes("betaling")) {
      return "Incasso";
    }
    return "Overige inkomsten";
  }

  // Kosten categorisatie
  const categories = {
    "Kantoor": ["kantoor", "office", "print", "papier", "schrijf"],
    "Software": ["software", "licentie", "abonnement", "saas", "app"],
    "Marketing": ["marketing", "advertentie", "facebook", "google", "linkedin"],
    "Reiskosten": ["trein", "ns", "vlucht", "hotel", "taxi", "uber"],
    "Communicatie": ["telefoon", "internet", "mobiel", "kpn", "vodafone"],
    "Huisvesting": ["huur", "gas", "licht", "elektra", "water"],
    "Verzekering": ["verzekering", "aansprakelijkheid", "bedrijfs"],
    "Bankkosten": ["bank", "transactie", "kosten"],
    "Belasting": ["belasting", "btw", "loon", "rsz"],
    "Professioneel": ["advies", "consult", "juridisch", "accountant"]
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => description.includes(keyword))) {
      return category;
    }
  }

  // Op basis van bedrag
  if (amount < 50) return "Kleine uitgaven";
  if (amount > 1000) return "Grote investering";

  return "Overige kosten";
}

// ─── Database operaties ───

async function linkTransactionToInvoice(supabase: SupabaseServiceClient, transactionId: string, invoiceId: string, confidence: number) {
  await supabase
    .from("bank_transactions")
    .update({
      linked_invoice_id: invoiceId,
      match_confidence: confidence,
      category: "Factuur betaling"
    })
    .eq("id", transactionId);

  await supabase
    .from("invoices")
    .update({
      linked_transaction_id: transactionId,
      status: "paid"
    })
    .eq("id", invoiceId);

  // Auto-ledger posting bij hoge confidence
  if (confidence >= 0.9) {
    try {
      const { data: invoice } = await supabase
        .from("invoices")
        .select("id, user_id, invoice_number, subtotal_ex_vat, vat_amount, vat_scheme")
        .eq("id", invoiceId)
        .single();

      const { data: transaction } = await supabase
        .from("bank_transactions")
        .select("booking_date, description")
        .eq("id", transactionId)
        .single();

      if (invoice && transaction) {
        const { count } = await supabase
          .from("ledger_entries")
          .select("id", { count: "exact", head: true })
          .eq("source_invoice_id", invoiceId);

        if (!count || count === 0) {
          await autoBookInvoice({
            invoiceId: invoice.id,
            userId: invoice.user_id,
            entryDate: transaction.booking_date ?? new Date().toISOString().split("T")[0],
            description: `Factuur betaling: ${invoice.invoice_number}`,
            subtotalExVat: invoice.subtotal_ex_vat,
            vatAmount: invoice.vat_amount ?? 0,
            vatScheme: invoice.vat_scheme ?? undefined,
            supabase: supabase as Parameters<typeof autoBookInvoice>[0]["supabase"],
          });
        }
      }
    } catch (err) {
      console.error(`[Bookkeeping Agent] Auto-ledger invoice fout:`, err);
    }
  }
}

async function linkTransactionToReceipt(supabase: SupabaseServiceClient, transactionId: string, receiptId: string, confidence: number) {
  await supabase
    .from("bank_transactions")
    .update({
      linked_receipt_id: receiptId,
      match_confidence: confidence
    })
    .eq("id", transactionId);

  await supabase
    .from("receipts")
    .update({
      linked_transaction_id: transactionId
    })
    .eq("id", receiptId);

  // Auto-ledger posting bij hoge confidence
  if (confidence >= 0.9) {
    try {
      const { data: receipt } = await supabase
        .from("receipts")
        .select("id, user_id, vendor_name, amount_ex_vat, vat_amount, cost_code, business_percentage, category")
        .eq("id", receiptId)
        .single();

      const { data: transaction } = await supabase
        .from("bank_transactions")
        .select("booking_date")
        .eq("id", transactionId)
        .single();

      if (receipt && transaction) {
        const { count } = await supabase
          .from("ledger_entries")
          .select("id", { count: "exact", head: true })
          .eq("source_receipt_id", receiptId);

        if (!count || count === 0) {
          await autoBookReceipt({
            receiptId: receipt.id,
            userId: receipt.user_id,
            entryDate: transaction.booking_date ?? new Date().toISOString().split("T")[0],
            description: receipt.vendor_name ?? "Onbekende leverancier",
            costCode: receipt.cost_code ?? 4999,
            amountExVat: receipt.amount_ex_vat ?? 0,
            vatAmount: receipt.vat_amount ?? 0,
            businessPercentage: receipt.business_percentage ?? 100,
            category: receipt.category ?? null,
            supabase: supabase as Parameters<typeof autoBookReceipt>[0]["supabase"],
          });
        }
      }
    } catch (err) {
      console.error(`[Bookkeeping Agent] Auto-ledger receipt fout:`, err);
    }
  }
}

async function storeCategorySuggestion(supabase: SupabaseServiceClient, transactionId: string, category: string, userId: string) {
  await supabase.from("category_suggestions").insert({
    user_id: userId,
    transaction_id: transactionId,
    suggested_category: category,
    confidence: 0.7,
    status: "pending"
  });
}

async function sendBookkeepingNotification(supabase: SupabaseServiceClient, userId: string, matches: number, suggestions: number) {
  if (matches > 0) {
    await supabase.from("action_feed").insert({
      user_id: userId,
      type: "bookkeeping_alert",
      title: `${matches} transactie(s) automatisch gekoppeld`,
      description: "Banktransacties zijn succesvol gekoppeld aan facturen en/of bonnen.",
      ai_confidence: 0.9,
    });
  }

  if (suggestions > 0) {
    await supabase.from("action_feed").insert({
      user_id: userId,
      type: "bookkeeping_alert",
      title: `${suggestions} categorisatie suggesties beschikbaar`,
      description: "Er zijn suggesties voor het categoriseren van ongeëncategoriseerde transacties.",
      ai_confidence: 0.7,
    });
  }
}
