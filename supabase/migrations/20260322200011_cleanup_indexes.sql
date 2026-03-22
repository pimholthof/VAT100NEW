-- ═══════════════════════════════════════════════════════════════════
-- Cleanup redundante indexen + covering index voor dashboard
-- ═══════════════════════════════════════════════════════════════════

-- Composite index idx_invoices_user_status_date(user_id, status, issue_date)
-- maakt deze individuele indexen overbodig (user_id zit altijd in WHERE door RLS)
drop index if exists idx_invoices_status;
drop index if exists idx_invoices_issue_date;

-- Covering index voor dashboard saldo-query
-- getDashboardData() doet: SELECT amount FROM bank_transactions WHERE user_id = ?
create index if not exists idx_bank_tx_user_amount
  on bank_transactions (user_id) include (amount);
