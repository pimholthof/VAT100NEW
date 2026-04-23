import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { generateBtwAangifte } from "@/features/tax/btw-aangifte";
import { BtwAangiftePDF } from "@/features/tax/components/BtwAangiftePDF";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const year = Number(searchParams.get("year")) || new Date().getFullYear();
  const quarter =
    Number(searchParams.get("quarter")) ||
    Math.ceil((new Date().getMonth() + 1) / 3);

  const result = await generateBtwAangifte(year, quarter);
  if (result.error || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "Er is een fout opgetreden" },
      { status: 500 },
    );
  }

  try {
    const element = createElement(BtwAangiftePDF, { data: result.data });
    const buffer = await renderToBuffer(
      element as unknown as Parameters<typeof renderToBuffer>[0],
    );

    const filename = `btw-aangifte-Q${quarter}-${year}.pdf`;

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
