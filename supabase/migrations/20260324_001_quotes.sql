-- Quotes (Offertes) tables
CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  client_id uuid REFERENCES clients(id) NOT NULL,
  quote_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','accepted','invoiced','rejected')),
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  valid_until date,
  vat_rate numeric NOT NULL DEFAULT 21,
  subtotal_ex_vat numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  total_inc_vat numeric NOT NULL DEFAULT 0,
  notes text,
  share_token text UNIQUE,
  converted_invoice_id uuid REFERENCES invoices(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE quote_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'uren' CHECK (unit IN ('uren','dagen','stuks')),
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

-- RLS
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own quotes" ON quotes
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Users can manage own quote lines" ON quote_lines
  FOR ALL USING (quote_id IN (SELECT id FROM quotes WHERE user_id = auth.uid()));

-- Quote number generator (same pattern as invoices)
CREATE OR REPLACE FUNCTION generate_quote_number(p_user_id uuid)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE next_num integer; result text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('quote_number_' || p_user_id::text));
  SELECT COALESCE(MAX(NULLIF(regexp_replace(quote_number, '[^0-9]', '', 'g'), '')::integer), 0) + 1
    INTO next_num FROM quotes WHERE user_id = p_user_id;
  result := 'OFF-' || LPAD(next_num::text, 4, '0');
  RETURN result;
END $$;

-- Indexes
CREATE UNIQUE INDEX idx_quotes_user_number ON quotes(user_id, quote_number);
CREATE INDEX idx_quotes_user_status ON quotes(user_id, status);
