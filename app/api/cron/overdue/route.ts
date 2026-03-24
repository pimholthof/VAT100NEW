import { NextRequest, NextResponse } from "next/server";
import { processOverdueInvoices } from "@/lib/use-cases/process-overdue-invoices";
import { getRequiredEnv } from "@/lib/utils/env";

/**
 * Cron: Overdue Invoice Handler (daily 06:00)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  const secret = cronHeader || authHeader?.replace("Bearer ", "");

  const expected = getRequiredEnv("CRON_SECRET");

  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await processOverdueInvoices();
    return NextResponse.json(data);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
