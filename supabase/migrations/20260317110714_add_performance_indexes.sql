-- VAT100 V2.0 - Performance Indexes

-- Clients table indexes
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients (user_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients USING btree (name);

-- Invoices table indexes
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices (issue_date DESC);

-- Invoice lines
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice_id ON invoice_lines (invoice_id);

-- Receipts table indexes
CREATE INDEX IF NOT EXISTS idx_receipts_user_id ON receipts (user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts (status);
CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts (date DESC);

-- Action feed items
CREATE INDEX IF NOT EXISTS idx_action_feed_user_id_resolved ON action_feed_items (user_id, status);
