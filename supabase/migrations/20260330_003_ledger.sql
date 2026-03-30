-- ══════════════════════════════════════════════════════════════
-- Ledger: Automated "kasboek-plus" journal entries
-- Asymmetric cost splitting for representatie (80/20)
-- 0% horeca BTW enforcement
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  account_code INT NOT NULL,        -- Grootboekrekening code
  account_name TEXT NOT NULL,        -- Grootboekrekening naam

  debit NUMERIC(12,2) NOT NULL DEFAULT 0,
  credit NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Source linking (exactly one should be set)
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  receipt_id UUID REFERENCES receipts(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,

  -- Metadata
  vat_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_representatie BOOLEAN NOT NULL DEFAULT FALSE,  -- 80/20 split marker
  split_percentage INT NOT NULL DEFAULT 100,        -- 80 or 20 for representatie splits
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ledger_user_date ON ledger_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger_entries(user_id, account_code);
CREATE INDEX IF NOT EXISTS idx_ledger_invoice ON ledger_entries(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ledger_receipt ON ledger_entries(receipt_id) WHERE receipt_id IS NOT NULL;
