import * as Sentry from "@sentry/nextjs";

const SENTRY_ENABLED = !!process.env.NEXT_PUBLIC_SENTRY_DSN;

/**
 * Known Supabase/PostgreSQL error codes mapped to Dutch user messages.
 */
const KNOWN_ERROR_CODES: Record<string, string> = {
  "23505": "Dit item bestaat al.",
  "23503": "Dit item is gekoppeld aan andere gegevens en kan niet worden verwijderd.",
  "23502": "Een verplicht veld ontbreekt.",
  "42501": "Je hebt geen toegang tot deze gegevens.",
  PGRST116: "Item niet gevonden.",
};

/**
 * Patterns in error messages that indicate known, safe-to-show errors.
 */
const KNOWN_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /idx_invoices_user_number/, message: "Dit factuurnummer is al in gebruik." },
  { pattern: /duplicate key/i, message: "Dit item bestaat al." },
  { pattern: /violates foreign key/i, message: "Gerelateerde gegevens niet gevonden." },
  { pattern: /violates not-null/i, message: "Een verplicht veld ontbreekt." },
];

const GENERIC_ERROR = "Er is een fout opgetreden. Probeer het opnieuw.";

/**
 * Sanitize a database or server error into a safe Dutch user message.
 * Logs the original error to Sentry for debugging.
 */
export function sanitizeError(
  error: unknown,
  context?: Record<string, unknown>
): string {
  // Extract error details
  const errorObj = error instanceof Error ? error : null;
  const message = errorObj?.message ?? String(error);
  const code = (error as { code?: string })?.code;

  // Check known error codes first
  if (code && KNOWN_ERROR_CODES[code]) {
    return KNOWN_ERROR_CODES[code];
  }

  // Check known message patterns
  for (const { pattern, message: userMessage } of KNOWN_PATTERNS) {
    if (pattern.test(message)) {
      return userMessage;
    }
  }

  // Unknown error — log to Sentry and return generic message.
  // When Sentry is not configured (no DSN), fall back to console.error so the
  // error still surfaces in server logs (Vercel) instead of vanishing silently.
  if (SENTRY_ENABLED) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error("[unhandled error]", error, context);
  }

  return GENERIC_ERROR;
}

/**
 * Sanitize a Supabase query error. Accepts the error object from a Supabase response.
 */
export function sanitizeSupabaseError(
  error: { message: string; code?: string } | null,
  context?: Record<string, unknown>
): string {
  if (!error) return GENERIC_ERROR;

  // Check known codes
  if (error.code && KNOWN_ERROR_CODES[error.code]) {
    return KNOWN_ERROR_CODES[error.code];
  }

  // Check patterns
  for (const { pattern, message } of KNOWN_PATTERNS) {
    if (pattern.test(error.message)) {
      return message;
    }
  }

  // Unknown — log and return generic. Console fallback when Sentry is disabled.
  if (SENTRY_ENABLED) {
    Sentry.captureMessage(`Supabase error: ${error.message}`, {
      level: "error",
      extra: { code: error.code, ...context },
    });
  } else {
    console.error("[supabase error]", error.message, { code: error.code, ...context });
  }

  return GENERIC_ERROR;
}

/**
 * Map a Server Action error string back to the appropriate HTTP status when
 * surfacing it from an API route. Server Actions used by API handlers
 * (e.g. generateBtwAangifte) call requireAuth/requirePlan/requireAdmin
 * internally and return a Dutch error string — without this helper the
 * route would have to fall back to a generic 500 even when the real
 * cause is "not logged in" or "no active subscription".
 */
export function actionErrorStatus(error: string): 401 | 403 | 500 {
  if (error === "Niet ingelogd.") return 401;
  if (
    error === "Geen toegang." ||
    error === "Geen actief abonnement." ||
    error === "Onbekend abonnement." ||
    error.startsWith("Upgrade naar ")
  ) {
    return 403;
  }
  return 500;
}
