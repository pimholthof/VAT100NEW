/**
 * Error handling utilities for consistent error messages across the app.
 */

/**
 * Extract a string message from an unknown error value.
 * Handles Error objects, strings, and other types.
 */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return String(e);
}
