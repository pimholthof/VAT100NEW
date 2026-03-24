-- Recurring invoices (templates with schedule)
CREATE TABLE recurring_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  frequency text NOT NULL CHECK (frequency IN ('weekly','monthly','quarterly','yearly')),
  next_run_date date NOT NULL,
  vat_rate numeric NOT NULL DEFAULT 21,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  auto_send boolean NOT NULL DEFAULT false,
  last_generated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE recurring_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_invoice_id uuid REFERENCES recurring_invoices(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'uren' CHECK (unit IN ('uren','dagen','stuks')),
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recurring invoices" ON recurring_invoices
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own recurring invoice lines" ON recurring_invoice_lines
  FOR ALL USING (recurring_invoice_id IN (SELECT id FROM recurring_invoices WHERE user_id = auth.uid()));

CREATE INDEX idx_recurring_user_active ON recurring_invoices(user_id, is_active) WHERE is_active = true;
