import { NextRequest, NextResponse } from "next/server";
import { processOverdueInvoices } from "@/lib/use-cases/process-overdue-invoices";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";

/**
 * Cron: Overdue Invoice Handler (daily 06:00)
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
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
