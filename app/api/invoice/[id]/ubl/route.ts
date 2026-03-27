import { NextRequest, NextResponse } from "next/server";
import { fetchInvoiceData } from "@/lib/invoice/fetch";
import { generateUBLInvoice } from "@/lib/invoice/ubl-generator";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const result = await fetchInvoiceData(id);

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "Er is een fout opgetreden" },
      { status: 404 },
    );
  }

  const data = result.data;

  try {
    const xml = generateUBLInvoice(data);
    const filename = `factuur-${data.invoice.invoice_number}.xml`;

    return new NextResponse(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Er is een fout opgetreden";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
