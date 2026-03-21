import { NextRequest, NextResponse } from "next/server";
import { processRecurringInvoices } from "@/lib/actions/recurring";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET || authHeader !== expectedToken) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const result = await processRecurringInvoices();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    created: result.data?.created ?? 0,
  });
}
