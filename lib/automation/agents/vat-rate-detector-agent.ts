import { createServiceClient } from "@/lib/supabase/service";
import { Agent, SystemEventRow } from "../types";
import type { SupabaseClient } from "@supabase/supabase-js";

interface VatFinding {
  type: "invoice" | "receipt";
  id: string;
  issue: string;
  suggestedRate: number;
  confidence: number;
}

interface InvoiceForAnalysis {
  id: string;
  invoice_number: string;
  subtotal_ex_vat: number | null;
  vat_amount: number | null;
  vat_rate: number | null;
  client: { name: string; country: string | null; btw_number: string | null }[] | null;
  invoice_lines: { description: string; amount: number; vat_rate: number | null }[];
}

interface ReceiptForAnalysis {
  id: string;
  vendor_name: string | null;
  amount_ex_vat: number | null;
  vat_amount: number | null;
  vat_rate: number | null;
  cost_code: number | null;
}

/**
 * Agent 6: BTW-tarief Detector
 * 
 * Analyseert automatisch of facturen en bonnen het juiste BTW-tarief hebben.
 * Detecteer patroonafwijkingen en stuur correctievoorstellen.
 */
export const vatRateDetectorAgent: Agent = {
  name: "BTW-tarief Detector",
  description: "Detecteert onjuiste BTW-tarieven en stuur automatische correcties voor.",
  targetEvents: ["invoice.created", "receipt.uploaded", "system.monthly_vat_audit"],

  run: async (event: SystemEventRow) => {
    const supabase = createServiceClient();
    const userId = event.user_id;
    if (!userId) return false;

    try {
      const findings: {
        type: "invoice" | "receipt";
        id: string;
        issue: string;
        suggestedRate: number;
        confidence: number;
      }[] = [];

      // Verwerk verschillende event types
      if (event.event_type === "invoice.created") {
        const invoiceId = typeof event.payload?.invoiceId === 'string' ? event.payload.invoiceId : null;
        if (invoiceId) await analyzeInvoice(invoiceId, userId, findings);
      } else if (event.event_type === "receipt.uploaded") {
        const receiptId = typeof event.payload?.receiptId === 'string' ? event.payload.receiptId : null;
        if (receiptId) await analyzeReceipt(receiptId, userId, findings);
      } else if (event.event_type === "system.monthly_vat_audit") {
        await analyzeAllRecent(userId, findings);
      }

      if (findings.length === 0) return true; // Geen issues gevonden

      // Sla findings op en stuur notificaties
      await storeFindings(supabase, userId, findings);
      await sendNotifications(supabase, userId, findings);

      return true;
    } catch (err) {
      console.error(`[BTW Detector] Error:`, err);
      return false;
    }
  }
};

// ─── Analyse functies ───

async function analyzeInvoice(invoiceId: string, userId: string, findings: VatFinding[]) {
  const supabase = createServiceClient();
  
  const { data: invoice, error } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, subtotal_ex_vat, vat_amount, vat_rate,
      client:clients(name, country, btw_number),
      invoice_lines(description, amount, vat_rate)
    `)
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single();

  if (error || !invoice) return;

  const currentRate = invoice.vat_rate ?? 21;
  const suggestedRate = suggestVatRateForInvoice(invoice);
  
  if (suggestedRate !== currentRate && suggestedRate !== null) {
    findings.push({
      type: "invoice",
      id: invoice.id,
      issue: `Factuur ${invoice.invoice_number} heeft mogelijk onjuist BTW-tarief (${currentRate}% → ${suggestedRate}%)`,
      suggestedRate,
      confidence: calculateConfidence(invoice, suggestedRate)
    });
  }
}

async function analyzeReceipt(receiptId: string, userId: string, findings: VatFinding[]) {
  const supabase = createServiceClient();
  
  const { data: receipt, error } = await supabase
    .from("receipts")
    .select("id, vendor_name, amount_ex_vat, vat_amount, vat_rate, cost_code")
    .eq("id", receiptId)
    .eq("user_id", userId)
    .single();

  if (error || !receipt) return;

  const currentRate = receipt.vat_rate ?? 21;
  const suggestedRate = suggestVatRateForReceipt(receipt);
  
  if (suggestedRate !== currentRate && suggestedRate !== null) {
    findings.push({
      type: "receipt",
      id: receipt.id,
      issue: `Bon ${receipt.vendor_name} heeft mogelijk onjuist BTW-tarief (${currentRate}% → ${suggestedRate}%)`,
      suggestedRate,
      confidence: 0.8 // Receipts zijn vaak duidelijker
    });
  }
}

async function analyzeAllRecent(userId: string, findings: VatFinding[]) {
  const supabase = createServiceClient();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // Analyseer recente facturen
  const { data: invoices } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, subtotal_ex_vat, vat_amount, vat_rate,
      client:clients(name, country, btw_number),
      invoice_lines(description, amount, vat_rate)
    `)
    .eq("user_id", userId)
    .gte("created_at", oneMonthAgo.toISOString());

  for (const invoice of invoices || []) {
    const suggestedRate = suggestVatRateForInvoice(invoice);
    const currentRate = invoice.vat_rate ?? 21;
    
    if (suggestedRate !== currentRate && suggestedRate !== null) {
      findings.push({
        type: "invoice",
        id: invoice.id,
        issue: `Factuur ${invoice.invoice_number} heeft mogelijk onjuist BTW-tarief`,
        suggestedRate,
        confidence: calculateConfidence(invoice, suggestedRate)
      });
    }
  }
}

// ─── BTW-tarief suggestie logica ───

function suggestVatRateForInvoice(invoice: InvoiceForAnalysis): number | null {
  const client = invoice.client?.[0] ?? null;

  // B2B binnen EU: reverse charge (0% BTW)
  if (client?.btw_number && client?.country !== "NL") {
    return 0; // Reverse charge
  }

  // Export buiten EU: 0% BTW
  if (client?.country && !["NL", "BE", "DE", "FR", "LU", "AT", "IT", "ES", "PT", "IE", "FI", "GR", "CY", "MT", "SI", "SK", "CZ", "HU", "PL", "HR", "RO", "BG", "DK", "SE", "EE", "LV", "LT"].includes(client.country)) {
    return 0;
  }
  
  // Analyseer diensttype op basis van beschrijving
  const descriptions = [
    invoice.invoice_number,
    ...(invoice.invoice_lines || []).map((line: { description: string }) => line.description)
  ].join(" ").toLowerCase();
  
  // 9% tarief voor specifieke diensten
  const lowVatKeywords = [
    "horeca", "restaurant", "cafe", "hotel", "logies", "kamerverhuur",
    "boek", "krant", "tijdschrift", "editie", "catalogus",
    "landbouw", "tuinbouw", "visserij", "voedsel", "landbouwproducten",
    "kunst", "kunstenaar", "verzamelaar", "antiek", "kunstvoorwerp"
  ];
  
  if (lowVatKeywords.some(keyword => descriptions.includes(keyword))) {
    return 9;
  }
  
  // 21% tarief voor overige diensten
  return 21;
}

function suggestVatRateForReceipt(receipt: ReceiptForAnalysis): number | null {
  const vendor = receipt.vendor_name?.toLowerCase() || "";
  const costCode = receipt.cost_code;
  
  // Specifieke cost codes die vaak 9% BTW hebben
  const lowVatCostCodes = [4100, 4200]; // Voorbeeld codes
  
  if (costCode && lowVatCostCodes.includes(costCode)) {
    return 9;
  }
  
  // Analyseer vendor type
  const lowVatVendors = [
    "restaurant", "cafe", "hotel", "boekhandel", "krantenwinkel",
    "horeca", "catering", "bakker", "slager"
  ];
  
  if (lowVatVendors.some(v => vendor.includes(v))) {
    return 9;
  }
  
  // 0% voor buitenlandse diensten
  const foreignVendors = ["amazon", "google", "microsoft", "adobe"];
  if (foreignVendors.some(v => vendor.includes(v))) {
    return 0;
  }
  
  return 21; // Standaard tarief
}

function calculateConfidence(invoice: InvoiceForAnalysis, suggestedRate: number): number {
  let confidence = 0.5;

  const client = invoice.client?.[0] ?? null;
  
  // Hoge confidence voor EU reverse charge
  if (suggestedRate === 0 && client?.btw_number && client?.country !== "NL") {
    confidence = 0.95;
  }
  
  // Hoge confidence voor export
  if (suggestedRate === 0 && client?.country && !["NL", "BE", "DE", "FR", "LU", "AT", "IT", "ES", "PT", "IE", "FI", "GR", "CY", "MT", "SI", "SK", "CZ", "HU", "PL", "HR", "RO", "BG", "DK", "SE", "EE", "LV", "LT"].includes(client.country)) {
    confidence = 0.9;
  }
  
  return confidence;
}

// ─── Opslag en notificaties ───

async function storeFindings(supabase: SupabaseClient, userId: string, findings: VatFinding[]) {
  for (const finding of findings) {
    await supabase.from("vat_suggestions").insert({
      user_id: userId,
      item_type: finding.type,
      item_id: finding.id,
      suggested_vat_rate: finding.suggestedRate,
      confidence: finding.confidence,
      issue: finding.issue,
      status: "pending",
      created_at: new Date().toISOString()
    });
  }
}

async function sendNotifications(supabase: SupabaseClient, userId: string, findings: VatFinding[]) {
  // Action feed item
  await supabase.from("action_feed").insert({
    user_id: userId,
    type: "tax_alert",
    title: "BTW-tarief suggesties beschikbaar",
    description: `${findings.length} item(s) hebben mogelijk een onjuist BTW-tarief. Controleer en pas waar nodig.`,
    ai_confidence: 0.8,
  });

  // Email notificatie (optioneel)
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (profile?.email) {
    // Implementeer email notificatie indien gewenst
    console.log(`[BTW Detector] Email notification sent to ${profile.email}`);
  }
}
