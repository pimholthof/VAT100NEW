/**
 * User Event Tracking voor SaaS Analytics
 *
 * Lightweight event tracking via de bestaande system_events tabel.
 * Non-blocking: tracking-fouten mogen nooit de hoofdflow blokkeren.
 */

import { createServiceClient } from "@/lib/supabase/service";

export type UserEventType =
  | "invoice_created"
  | "invoice_sent"
  | "invoice_paid"
  | "invoice_overdue"
  | "credit_note_created"
  | "receipt_uploaded"
  | "bank_synced"
  | "bank_connected"
  | "transaction_categorized"
  | "vat_return_created"
  | "vat_return_submitted"
  | "client_created"
  | "quote_created"
  | "quote_sent"
  | "recurring_invoice_created"
  | "export_generated"
  | "payment_link_created"
  | "profile_updated";

/**
 * Track een gebruikersactie. Fire-and-forget.
 */
export function trackUserEvent(
  userId: string,
  eventType: UserEventType,
  metadata?: Record<string, unknown>
): void {
  // Fire-and-forget: geen await, fouten worden geslikt
  _trackUserEvent(userId, eventType, metadata).catch(() => {});
}

async function _trackUserEvent(
  userId: string,
  eventType: UserEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient();
  await supabase.from("system_events").insert({
    event_type: `user.${eventType}`,
    payload: {
      user_id: userId,
      ...metadata,
    },
  });
}
