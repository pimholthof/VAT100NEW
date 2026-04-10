/**
 * Distributed Cron Locking
 *
 * Voorkomt dubbele cron-executies via een database-gebaseerde lock.
 * Als een job al draait, wordt de nieuwe executie overgeslagen.
 * Locks verlopen automatisch na de opgegeven TTL.
 */

import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";

const DEFAULT_TTL_MINUTES = 10;

/**
 * Probeer een lock te verkrijgen voor een cron job.
 * Retourneert een lockToken als succesvol, null als de job al draait.
 */
export async function acquireCronLock(
  jobName: string,
  ttlMinutes = DEFAULT_TTL_MINUTES
): Promise<string | null> {
  const supabase = createServiceClient();
  const lockToken = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  // Verwijder eerst verlopen locks
  await supabase
    .from("cron_locks")
    .delete()
    .lt("expires_at", now.toISOString());

  // Probeer lock te claimen via upsert met conflict handling
  const { error } = await supabase.from("cron_locks").insert({
    job_name: jobName,
    locked_at: now.toISOString(),
    locked_by: lockToken,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    // Unique constraint violation = lock bestaat al
    if (error.code === "23505") {
      return null;
    }
    // Bij andere fouten: laat de job toch draaien (fail-open)
    return lockToken;
  }

  return lockToken;
}

/**
 * Geef een lock weer vrij na succesvolle afloop van de cron job.
 */
export async function releaseCronLock(
  jobName: string,
  lockToken: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("cron_locks")
    .delete()
    .eq("job_name", jobName)
    .eq("locked_by", lockToken);
}

/**
 * Wrapper die een cron handler uitvoert met lock-bescherming.
 */
export async function withCronLock<T>(
  jobName: string,
  handler: () => Promise<T>,
  ttlMinutes = DEFAULT_TTL_MINUTES
): Promise<T | null> {
  const lockToken = await acquireCronLock(jobName, ttlMinutes);
  if (!lockToken) {
    return null; // Job draait al
  }

  try {
    return await handler();
  } finally {
    await releaseCronLock(jobName, lockToken);
  }
}
