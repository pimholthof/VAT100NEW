-- VAT100 - Composite indexes for common query patterns

-- Dashboard: invoices filtered by user + status (sent, overdue, paid)
CREATE INDEX IF NOT EXISTS idx_invoices_user_status ON invoices (user_id, status);

-- Dashboard: invoices filtered by user + date range
CREATE INDEX IF NOT EXISTS idx_invoices_user_issue_date ON invoices (user_id, issue_date);

-- Receipts: filtered by user + date range
CREATE INDEX IF NOT EXISTS idx_receipts_user_receipt_date ON receipts (user_id, receipt_date);

-- Bank transactions: filtered by user + category (reconciliation agent)
CREATE INDEX IF NOT EXISTS idx_bank_tx_user_category ON bank_transactions (user_id, category);

-- Bank transactions: filtered by user + booking date (dashboard cashflow)
CREATE INDEX IF NOT EXISTS idx_bank_tx_user_booking_date ON bank_transactions (user_id, booking_date);

-- Action feed: filtered by user + status (pending items inbox)
CREATE INDEX IF NOT EXISTS idx_action_feed_user_status ON action_feed (user_id, status);

-- Action feed: filtered by user + type + status (agent deduplication checks)
CREATE INDEX IF NOT EXISTS idx_action_feed_user_type_status ON action_feed (user_id, type, status);
