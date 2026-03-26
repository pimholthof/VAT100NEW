import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getJaarrekeningData } from "@/features/tax/jaarrekening";
import { JaarrekeningPDF } from "@/features/tax/components/JaarrekeningPDF";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ year: string }> },
) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (!year || year < 2020 || year > new Date().getFullYear()) {
    return NextResponse.json({ error: "Ongeldig jaar" }, { status: 400 });
  }

  const result = await getJaarrekeningData(year);

  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "Er is een fout opgetreden" },
      { status: 500 },
    );
  }

  try {
    const element = createElement(JaarrekeningPDF, { data: result.data });
    const buffer = await renderToBuffer(
      element as unknown as Parameters<typeof renderToBuffer>[0],
    );

    const filename = `jaarrekening-${year}.pdf`;

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
