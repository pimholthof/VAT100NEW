-- Email preferences for GDPR unsubscribe compliance
CREATE TABLE IF NOT EXISTS public.email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unsubscribe_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  marketing_emails boolean NOT NULL DEFAULT true,
  reminder_emails boolean NOT NULL DEFAULT true,
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_email_preferences_user UNIQUE(user_id),
  CONSTRAINT uq_email_preferences_token UNIQUE(unsubscribe_token)
);

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_prefs" ON public.email_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Service role needs full access for email sending
CREATE POLICY "service_role_all" ON public.email_preferences
  FOR ALL USING (true) WITH CHECK (true);
