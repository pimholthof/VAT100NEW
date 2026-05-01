import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import { InvoicePDF } from "@/features/invoices/components/InvoicePDF";
import type { InvoiceTemplate } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

const VALID_TEMPLATES = ["poster", "minimaal", "klassiek", "strak", "editoriaal"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = await fetchInvoiceData(id);

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "Er is een fout opgetreden" },
      { status: 404 }
    );
  }

  const data = result.data;
  const templateParam = request.nextUrl.searchParams.get("template") ?? "poster";
  const template = (VALID_TEMPLATES.includes(templateParam) ? templateParam : "poster") as InvoiceTemplate;

  // Plus-tier mag witlabelen; alle andere tiers houden "Gemaakt met VAT100" footer.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let branded = true;
  let logoUrl: string | null = null;
  if (user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", user.id)
      .in("status", ["active", "past_due"])
      .single();
    const isPlus = sub?.plan_id === "plus" || sub?.plan_id === "plus_yearly";
    if (isPlus) {
      branded = false;
      if (data.profile.logo_path) {
        const { data: signed } = await supabase.storage
          .from("receipts")
          .createSignedUrl(data.profile.logo_path, 3600);
        logoUrl = signed?.signedUrl ?? null;
      }
    }
  }

  try {
    const element = createElement(InvoicePDF, { data, template, branded, logoUrl });
    const buffer = await renderToBuffer(
      element as unknown as Parameters<typeof renderToBuffer>[0]
    );

    // Track which template was used
    await supabase
      .from("invoices")
      .update({ pdf_template: template })
      .eq("id", id);

    const filename = `factuur-${data.invoice.invoice_number}.pdf`;

    return new NextResponse(Buffer.from(buffer) as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Er is een fout opgetreden";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
