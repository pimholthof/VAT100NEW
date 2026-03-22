import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import { InvoicePDF } from "@/features/invoices/components/InvoicePDF";

export async function GET(
  _request: NextRequest,
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

  try {
    const element = createElement(InvoicePDF, { data });
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
