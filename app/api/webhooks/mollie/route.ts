import { NextRequest, NextResponse } from "next/server";
import { getMolliePayment } from "@/lib/payments/mollie";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Mollie webhook: wordt aangeroepen wanneer een betaalstatus wijzigt.
 * Mollie stuurt alleen het payment ID; wij halen de status op via de API.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const paymentId = formData.get("id") as string | null;

    if (!paymentId) {
      return NextResponse.json({ error: "Geen payment ID" }, { status: 400 });
    }

    const { data: payment, error } = await getMolliePayment(paymentId);
    if (error || !payment) {
      return NextResponse.json({ error: error ?? "Betaling niet gevonden" }, { status: 500 });
    }

    // Alleen verwerken als de betaling daadwerkelijk betaald is
    if (payment.status !== "paid") {
      return NextResponse.json({ status: "ignored", paymentStatus: payment.status });
    }

    const supabase = createServiceClient();

    // Zoek de factuur via mollie_payment_id
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .select("id, status")
      .eq("mollie_payment_id", paymentId)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: "Factuur niet gevonden voor deze betaling" }, { status: 404 });
    }

    // Update factuurstatus naar betaald
    if (invoice.status !== "paid") {
      await supabase
        .from("invoices")
        .update({
          status: "paid",
          payment_method: payment.method ?? "online",
        })
        .eq("id", invoice.id);
    }

    return NextResponse.json({ status: "processed", invoiceId: invoice.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Onbekende fout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
