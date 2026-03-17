import { NextRequest, NextResponse } from "next/server";
import { processOverdueInvoices } from "@/lib/actions/invoices";

/**
 * Cron: Overdue Invoice Handler (daily 06:00)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const secret = cronHeader || authHeader?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processOverdueInvoices();

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json(result.data);
}
