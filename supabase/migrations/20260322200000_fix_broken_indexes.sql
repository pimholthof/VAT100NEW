-- ═══════════════════════════════════════════════════════════════════
-- Fix broken indexes from migration 20260317110714
-- Drie fouten: receipts.status (bestaat niet), receipts.date (moet receipt_date),
-- action_feed_items (moet action_feed)
-- ═══════════════════════════════════════════════════════════════════

-- Drop foutieve indexen (IF EXISTS zodat dit veilig is)
drop index if exists idx_receipts_status;
drop index if exists idx_receipts_date;
drop index if exists idx_action_feed_user_id_resolved;

-- Correcte indexen aanmaken
create index if not exists idx_receipts_receipt_date_desc
  on receipts (receipt_date desc);

create index if not exists idx_action_feed_user_status
  on action_feed (user_id, status);
