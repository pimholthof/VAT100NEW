"use server";

import { requirePlan } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { ActionResult } from "@/lib/types";
import {
  submitToDigipoort,
  buildBtwXbrl,
  type DigipoortFilingType,
} from "@/lib/digipoort/client";

export interface FileDigipoortInput {
  filingType: DigipoortFilingType;
  period: string;
  rubrieken: Record<string, number>;
}

/**
 * Dien een BTW-aangifte rechtstreeks in bij de Belastingdienst via Digipoort.
 *
 * Alleen voor Plus-tier — dit is de strategische differentiator die VAT100
 * onderscheidt van Moneybird/Tellow (die allemaal handmatig exporteren).
 */
export async function fileBtwViaDigipoort(
  input: FileDigipoortInput,
): Promise<ActionResult<{ reference: string | null; status: string }>> {
  const planCheck = await requirePlan("plus");
  if (planCheck.error !== null) return { error: planCheck.error };

  const supabase = createServiceClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("kvk_number, btw_number, full_name")
    .eq("id", planCheck.user.id)
    .single();

  if (!profile?.btw_number) {
    return { error: "BTW-nummer ontbreekt in je profiel." };
  }

  // RSIN = BTW-nummer zonder 'NL' prefix en zonder 'B01' suffix
  const rsin = profile.btw_number
    .replace(/^NL/, "")
    .replace(/B\d{2}$/, "");

  const xbrl = buildBtwXbrl({
    rsin,
    period: input.period,
    rubrieken: input.rubrieken,
  });

  // Registreer filing als 'draft'
  const { data: filing, error: insertError } = await supabase
    .from("digipoort_filings")
    .insert({
      user_id: planCheck.user.id,
      filing_type: input.filingType,
      period: input.period,
      status: "draft",
      payload_xbrl: xbrl,
    })
    .select("id")
    .single();

  if (insertError || !filing) {
    return { error: "Kon aangifte niet opslaan." };
  }

  // Verzenden
  const response = await submitToDigipoort({
    filingType: input.filingType,
    period: input.period,
    fiscalNumber: rsin,
    xbrlDocument: xbrl,
  });

  const status =
    response.status === "accepted"
      ? "accepted"
      : response.status === "rejected"
        ? "rejected"
        : "error";

  await supabase
    .from("digipoort_filings")
    .update({
      status,
      digipoort_reference: response.reference,
      response_payload: response.rawResponse as Record<string, unknown>,
      submitted_at: new Date().toISOString(),
      accepted_at: response.acceptedAt,
      error_message: response.errors.join("; ") || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", filing.id);

  return {
    error: null,
    data: {
      reference: response.reference,
      status,
    },
  };
}
