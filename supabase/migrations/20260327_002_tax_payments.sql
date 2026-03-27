-- Voorlopige aanslag tracking: bijhouden van kwartaal/maandbetalingen aan Belastingdienst
CREATE TABLE tax_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('ib', 'btw')),
  period TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  paid_date DATE,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE tax_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tax payments"
  ON tax_payments FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Index
CREATE INDEX idx_tax_payments_user_id ON tax_payments(user_id);
