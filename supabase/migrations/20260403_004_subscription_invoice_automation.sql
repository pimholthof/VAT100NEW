-- Add invoice tracking fields to subscription_payments
ALTER TABLE subscription_payments
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS receipt_sent_at timestamptz;

-- Create subscription reminder tracking table for escalating failed payment reminders
CREATE TABLE IF NOT EXISTS subscription_reminders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  step integer NOT NULL DEFAULT 1,
  sent_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_reminders_subscription_id ON subscription_reminders(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_reminders_sent_at ON subscription_reminders(sent_at);

-- RLS for subscription_reminders (admin only via service role)
ALTER TABLE subscription_reminders ENABLE ROW LEVEL SECURITY;
