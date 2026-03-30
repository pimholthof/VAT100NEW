-- Grootboek (General Ledger) tables

-- Ledger accounts (rekeningschema)
CREATE TABLE ledger_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code int UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL, -- 'activa', 'passiva', 'kosten', 'omzet', 'prive'
  parent_code int REFERENCES ledger_accounts(code),
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed standard ZZP rekeningschema
INSERT INTO ledger_accounts (code, name, type) VALUES
  (1000, 'Bank', 'activa'),
  (1100, 'Kas', 'activa'),
  (1300, 'Debiteuren', 'activa'),
  (1400, 'Crediteuren', 'passiva'),
  (2100, 'BTW af te dragen', 'passiva'),
  (2200, 'BTW terug te vorderen', 'activa'),
  (3100, 'Privé', 'prive'),
  (4000, 'Omzet', 'omzet'),
  (4100, 'Huur', 'kosten'),
  (4105, 'Energie', 'kosten'),
  (4230, 'Kleine investeringen', 'kosten'),
  (4300, 'Kantoorkosten', 'kosten'),
  (4330, 'Computer & software', 'kosten'),
  (4340, 'Telefoon', 'kosten'),
  (4400, 'Verzekeringen', 'kosten'),
  (4500, 'Representatie', 'kosten'),
  (4510, 'Reiskosten', 'kosten'),
  (4600, 'Reclame & marketing', 'kosten'),
  (4700, 'Accountant & advies', 'kosten'),
  (4750, 'Bankkosten', 'kosten'),
  (4800, 'Abonnementen & licenties', 'kosten'),
  (4900, 'Eten & drinken zakelijk', 'kosten'),
  (4910, 'Gereedschap & materiaal', 'kosten'),
  (4999, 'Overige kosten', 'kosten');

-- Ledger entries (journaalposten)
CREATE TABLE ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  description text NOT NULL,
  source_invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  source_receipt_id uuid REFERENCES receipts(id) ON DELETE SET NULL,
  debit_account int NOT NULL REFERENCES ledger_accounts(code),
  credit_account int NOT NULL REFERENCES ledger_accounts(code),
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ledger_entries"
  ON ledger_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ledger_entries"
  ON ledger_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ledger_entries"
  ON ledger_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ledger_entries"
  ON ledger_entries FOR DELETE
  USING (auth.uid() = user_id);

-- ledger_accounts is read-only for all authenticated users (system data)
ALTER TABLE ledger_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ledger_accounts"
  ON ledger_accounts FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX idx_ledger_entries_user_date ON ledger_entries(user_id, entry_date);
CREATE INDEX idx_ledger_entries_source_invoice ON ledger_entries(source_invoice_id) WHERE source_invoice_id IS NOT NULL;
CREATE INDEX idx_ledger_entries_source_receipt ON ledger_entries(source_receipt_id) WHERE source_receipt_id IS NOT NULL;
