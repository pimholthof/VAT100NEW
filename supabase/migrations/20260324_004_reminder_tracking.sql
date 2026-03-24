-- Payment reminders tracking with escalation steps
CREATE TABLE invoice_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) NOT NULL,
  user_id uuid REFERENCES profiles(id) NOT NULL,
  step integer NOT NULL DEFAULT 1, -- 1=herinnering, 2=aanmaning, 3=incasso
  sent_at timestamptz NOT NULL DEFAULT now(),
  email_content text
);

ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminders" ON invoice_reminders
  FOR ALL USING (user_id = auth.uid());

CREATE INDEX idx_reminders_invoice ON invoice_reminders(invoice_id);
CREATE INDEX idx_reminders_user ON invoice_reminders(user_id);
