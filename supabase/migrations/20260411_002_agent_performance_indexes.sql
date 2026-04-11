-- =============================================
-- Migration: Agent Performance Indexes
-- Partial indexes voor veelgebruikte agent query-patronen.
-- =============================================

-- 1. Ongeëncategoriseerde transacties (bookkeeping-agent, reconciliation-agent)
-- Wordt dagelijks ge-queried door performDailyReconciliation en runReconciliationAgent
create index if not exists idx_bank_transactions_uncategorized
  on bank_transactions (user_id, date)
  where linked_invoice_id is null
    and linked_receipt_id is null
    and category is null;

-- 2. Claimable system events (event-processor)
-- Versnelt de core event fetch query die elke 15 minuten draait
create index if not exists idx_system_events_claimable
  on system_events (created_at)
  where processed_at is null
    and failed_at is null;

-- 3. Deduplicatie index voor deadline_alerts
-- Voorkomt dubbele alerts per user/type/kwartaal/jaar
create unique index if not exists idx_deadline_alerts_dedup
  on deadline_alerts (user_id, alert_type, coalesce(quarter, 0), coalesce(year, 0))
  where status = 'active';
