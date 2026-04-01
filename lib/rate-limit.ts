/**
 * Database-backed rate limiter using Supabase.
 * Works across serverless instances (unlike in-memory Maps).
 *
 * Fallback: If the rate_limits table doesn't exist yet, uses a simple
 * in-memory approach (acceptable for single-instance deploys).
 */

import { createServiceClient } from "@/lib/supabase/service";

const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

// In-memory fallback for when DB table doesn't exist
const fallbackMap = new Map<string, { count: number; resetAt: number }>();

function checkFallback(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = fallbackMap.get(key);
  if (!entry || now > entry.resetAt) {
    fallbackMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > limit;
}

/**
 * Check if a key (IP or user ID) has exceeded the rate limit.
 * Returns true if rate-limited.
 */
export async function isRateLimited(
  key: string,
  limit: number = RATE_LIMIT,
  windowMs: number = RATE_WINDOW_MS
): Promise<boolean> {
  try {
    const supabase = createServiceClient();
    const windowStart = new Date(Date.now() - windowMs).toISOString();

    // Count recent requests within window
    const { count, error } = await supabase
      .from("rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("key", key)
      .gte("created_at", windowStart);

    if (error) {
      // Table doesn't exist or other DB error — use fallback
      return checkFallback(key, limit, windowMs);
    }

    if ((count ?? 0) >= limit) {
      return true;
    }

    // Record this request
    const { error: insertError } = await supabase.from("rate_limits").insert({ key });
    if (insertError) {
      return checkFallback(key, limit, windowMs);
    }

    // Cleanup old entries (async, non-blocking)
    supabase
      .from("rate_limits")
      .delete()
      .lt("created_at", windowStart)
      .then(() => {}, () => {});

    return false;
  } catch {
    // Any error — fall back to in-memory
    return checkFallback(key, limit, windowMs);
  }
}
