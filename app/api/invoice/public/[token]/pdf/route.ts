import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { fetchInvoiceByToken } from "@/lib/invoice/fetch-public";
import { InvoicePDF } from "@/features/invoices/components/InvoicePDF";
import type { InvoiceTemplate } from "@/lib/types";
import { createServiceClient } from "@/lib/supabase/service";

const VALID_TEMPLATES = ["poster", "minimaal", "klassiek", "strak"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const result = await fetchInvoiceByToken(token);

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "Factuur niet gevonden" },
      { status: 404 }
    );
  }

  try {
    const data = result.data;
    const templateParam = request.nextUrl.searchParams.get("template") ?? "poster";
    const template = (VALID_TEMPLATES.includes(templateParam) ? templateParam : "poster") as InvoiceTemplate;

    // Respect white-label voor Plus-abonnees op gedeelde links.
    const svc = createServiceClient();
    const { data: sub } = await svc
      .from("subscriptions")
      .select("plan_id")
      .eq("user_id", data.profile.id)
      .in("status", ["active", "past_due"])
      .single();
    const branded = !(sub?.plan_id === "plus" || sub?.plan_id === "plus_yearly");

    const element = createElement(InvoicePDF, { data, template, branded });
    const buffer = await renderToBuffer(
      element as unknown as Parameters<typeof renderToBuffer>[0]
    );

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
