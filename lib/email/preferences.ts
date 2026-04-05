import { createServiceClient } from "@/lib/supabase/service";

/**
 * Get or create the unsubscribe token for a user.
 * Used in all outgoing emails to provide GDPR-compliant unsubscribe link.
 */
export async function getOrCreateUnsubscribeToken(userId: string): Promise<string | null> {
  const supabase = createServiceClient();

  // Try to find existing
  const { data: existing } = await supabase
    .from("email_preferences")
    .select("unsubscribe_token")
    .eq("user_id", userId)
    .single();

  if (existing?.unsubscribe_token) return existing.unsubscribe_token;

  // Create new
  const { data: created } = await supabase
    .from("email_preferences")
    .insert({ user_id: userId })
    .select("unsubscribe_token")
    .single();

  return created?.unsubscribe_token ?? null;
}

export interface EmailPreferences {
  marketing_emails: boolean;
  reminder_emails: boolean;
}

/**
 * Get email preferences for a user. Returns defaults if no record exists.
 */
export async function getEmailPreferences(userId: string): Promise<EmailPreferences> {
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("email_preferences")
    .select("marketing_emails, reminder_emails")
    .eq("user_id", userId)
    .single();

  return {
    marketing_emails: data?.marketing_emails ?? true,
    reminder_emails: data?.reminder_emails ?? true,
  };
}
