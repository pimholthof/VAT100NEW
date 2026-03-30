-- ============================================================================
-- VAT100 — Bank CSV Import Support
-- Allow bank transactions to be imported via CSV without a GoCardless connection.
-- ============================================================================

-- Make bank_connection_id nullable for CSV-imported transactions
ALTER TABLE bank_transactions ALTER COLUMN bank_connection_id DROP NOT NULL;

-- Add source column to distinguish GoCardless from CSV
ALTER TABLE bank_transactions ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'gocardless'
  CHECK (source IN ('gocardless', 'csv'));

-- Drop the existing unique constraint (bank_connection_id, external_id)
-- and replace with partial indexes for each source type
ALTER TABLE bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_bank_connection_id_external_id_key;

-- GoCardless transactions: unique per connection + external_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_tx_gocardless_dedup
  ON bank_transactions (bank_connection_id, external_id)
  WHERE bank_connection_id IS NOT NULL;

-- CSV transactions: unique per user + external_id (hash-based)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_tx_csv_dedup
  ON bank_transactions (user_id, external_id)
  WHERE source = 'csv';
