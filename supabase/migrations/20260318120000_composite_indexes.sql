-- Composite indexes for common dashboard and agent queries

CREATE INDEX IF NOT EXISTS idx_invoices_user_status_date
  ON invoices (user_id, status, issue_date DESC);

CREATE INDEX IF NOT EXISTS idx_receipts_user_date
  ON receipts (user_id, receipt_date DESC);

CREATE INDEX IF NOT EXISTS idx_bank_tx_user_category
  ON bank_transactions (user_id, category);

CREATE INDEX IF NOT EXISTS idx_action_feed_user_status_type
  ON action_feed (user_id, status, type);
