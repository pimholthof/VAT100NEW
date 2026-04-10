import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCronSecret } from "@/lib/auth/verify-cron-secret";
import {
  runReconciliationAgent,
  runAnticipationAgent,
  runInvestmentAgent,
  runPaymentDetectionAgent,
  runMissingReceiptDetection,
  runBtwDeadlineAlert,
} from "@/features/dashboard/action-feed";
import * as Sentry from "@sentry/nextjs";
import { alertCronFailure } from "@/lib/monitoring/cron-alerts";
import { prepareVatReturns, isQuarterStart } from "@/lib/use-cases/prepare-vat-returns";
import { generateAnnualReportNotifications, isAnnualReportDay } from "@/lib/use-cases/generate-annual-reports";

/**
 * Configuration for batch processing
 */
const BATCH_SIZE = 50; // Users per batch
const CONCURRENCY = 5; // Parallel user processing
const MAX_EXECUTION_TIME_MS = 55000; // Vercel cron limit is 60s, stay under

interface UserResult {
  userId: string;
  reconciliation: number;
  payment: number;
  anticipation: number;
  investment: number;
  missingReceipt: number;
  btwDeadlineAlert: boolean;
  errors: string[];
}

/**
 * Process a single user with all agents
 */
async function processUser(userId: string, supabase: ReturnType<typeof createServiceClient>): Promise<UserResult> {
  const errors: string[] = [];
  
  const [recRes, payRes, antRes, invRes, missingReceiptRes, btwDeadlineRes] = await Promise.all([
    runReconciliationAgent(userId, supabase).catch((e) => {
      Sentry.captureException(e, { tags: { agent: "reconciliation", userId } });
      errors.push(`reconciliation: ${e instanceof Error ? e.message : String(e)}`);
      return { error: "failed", data: { created: 0 } };
    }),
    runPaymentDetectionAgent(userId, supabase).catch((e) => {
      Sentry.captureException(e, { tags: { agent: "payment-detection", userId } });
      errors.push(`payment: ${e instanceof Error ? e.message : String(e)}`);
      return { error: "failed", data: { created: 0 } };
    }),
    runAnticipationAgent(userId, supabase).catch((e) => {
      Sentry.captureException(e, { tags: { agent: "anticipation", userId } });
      errors.push(`anticipation: ${e instanceof Error ? e.message : String(e)}`);
      return { error: "failed", data: { created: 0 } };
    }),
    runInvestmentAgent(userId, supabase).catch((e) => {
      Sentry.captureException(e, { tags: { agent: "investment", userId } });
      errors.push(`investment: ${e instanceof Error ? e.message : String(e)}`);
      return { error: "failed", data: { created: 0 } };
    }),
    runMissingReceiptDetection(userId, supabase).catch((e) => {
      Sentry.captureException(e, { tags: { agent: "missing-receipt", userId } });
      errors.push(`missing_receipt: ${e instanceof Error ? e.message : String(e)}`);
      return { error: "failed", data: { created: 0 } };
    }),
    runBtwDeadlineAlert(userId, supabase).catch((e) => {
      Sentry.captureException(e, { tags: { agent: "btw-deadline", userId } });
      errors.push(`btw_deadline: ${e instanceof Error ? e.message : String(e)}`);
      return { error: "failed", data: { created: false } };
    }),
  ]);

  return {
    userId,
    reconciliation: recRes.data?.created ?? 0,
    payment: payRes.data?.created ?? 0,
    anticipation: antRes.data?.created ?? 0,
    investment: invRes.data?.created ?? 0,
    missingReceipt: missingReceiptRes.data?.created ?? 0,
    btwDeadlineAlert: btwDeadlineRes.data?.created ?? false,
    errors,
  };
}

/**
 * Process users with limited concurrency
 */
async function processBatch(users: { id: string }[], supabase: ReturnType<typeof createServiceClient>): Promise<UserResult[]> {
  const results: UserResult[] = [];
  
  // Process in chunks of CONCURRENCY
  for (let i = 0; i < users.length; i += CONCURRENCY) {
    const chunk = users.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(
      chunk.map(user => processUser(user.id, supabase))
    );
    results.push(...chunkResults);
  }
  
  return results;
}

const BATCH_SIZE = 10;
const MAX_EXECUTION_MS = 8000;

/**
 * Cron: Run all AI agents for all active users (daily 03:00)
 * 
 * Scales with batching and concurrency limits to handle large user bases.
 * If timeout approaches, returns partial results for resumption.
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const supabase = createServiceClient();

  // Get offset from query params for resumption
  const url = new URL(request.url);
  const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

  // Fetch users with pagination
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id")
    .order("id")
    .range(offset, offset + BATCH_SIZE - 1);

  if (usersError) {
    await alertCronFailure("agents", usersError);
    return NextResponse.json({ error: usersError.message }, { status: 500 });
  }

  if (!users || users.length === 0) {
    // All users processed, log completion
    await supabase.from("system_events").insert({
      event_type: "cron.agents.complete",
      payload: { message: "All user batches processed" },
      processed_at: new Date().toISOString(),
    });
    
    return NextResponse.json({
      status: "complete",
      message: "All users processed",
    });
  }

  // Process batch with concurrency limits
  const results = await processBatch(users, supabase);
  
  const totalTime = Date.now() - startTime;
  const hasMoreUsers = users.length === BATCH_SIZE;
  
  // Automatische BTW-aangifte voorbereiding (op de 1e van elk kwartaal)
  let vatPrepResult = null;
  if (isQuarterStart() && !hasMoreUsers) {
    try {
      vatPrepResult = await prepareVatReturns();
    } catch (e) {
      Sentry.captureException(e, { tags: { agent: "vat-preparation" } });
    }
  }

  // Automatische jaarrekening notificaties (op 2 januari, alleen Compleet)
  let annualReportResult = null;
  if (isAnnualReportDay() && !hasMoreUsers) {
    try {
      annualReportResult = await generateAnnualReportNotifications();
    } catch (e) {
      Sentry.captureException(e, { tags: { agent: "annual-report" } });
    }
  }

  // Log batch results
  await supabase.from("system_events").insert({
    event_type: "cron.agents",
    payload: {
      batch_offset: offset,
      batch_size: users.length,
      execution_time_ms: totalTime,
      reconciliation_created: results.reduce((sum, r) => sum + r.reconciliation, 0),
      payment_created: results.reduce((sum, r) => sum + r.payment, 0),
      anticipation_created: results.reduce((sum, r) => sum + r.anticipation, 0),
      investment_created: results.reduce((sum, r) => sum + r.investment, 0),
      missing_receipt_created: results.reduce((sum, r) => sum + r.missingReceipt, 0),
      btw_deadline_alerts_created: results.filter((r) => r.btwDeadlineAlert).length,
      users_with_errors: results.filter((r) => r.errors.length > 0).length,
      has_more: hasMoreUsers,
      vat_prep: vatPrepResult,
      annual_report: annualReportResult,
    },
    processed_at: new Date().toISOString(),
  });

  // If approaching timeout and more users exist, signal continuation needed
  if (hasMoreUsers && totalTime > MAX_EXECUTION_TIME_MS) {
    return NextResponse.json({
      status: "partial",
      message: `Processed ${users.length} users in ${totalTime}ms. Call with ?offset=${offset + BATCH_SIZE} to continue.`,
      nextOffset: offset + BATCH_SIZE,
      usersProcessed: results.length,
    }, { status: 202 });
  }

  // Trigger next batch automatically via self-call if more users
  if (hasMoreUsers) {
    // Fire-and-forget continuation
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/agents?offset=${offset + BATCH_SIZE}`, {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    }).catch(() => {}); // Non-blocking
  }

  return NextResponse.json({
    status: hasMoreUsers ? "continuing" : "complete",
    batchOffset: offset,
    usersProcessed: results.length,
    executionTimeMs: totalTime,
    nextOffset: hasMoreUsers ? offset + BATCH_SIZE : null,
    results,
    vatPrep: vatPrepResult,
    annualReport: annualReportResult,
  });
}
