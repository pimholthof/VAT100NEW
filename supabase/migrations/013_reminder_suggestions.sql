-- Migration 013: Add related_invoice_id to action_feed and expand type constraint
alter table action_feed 
  add column if not exists related_invoice_id uuid references invoices(id) on delete set null;

alter table action_feed 
  drop constraint if exists action_feed_type_check;

alter table action_feed 
  add constraint action_feed_type_check 
  check (type in ('missing_receipt', 'match_suggestion', 'tax_alert', 'uncategorized', 'reminder_suggestion'));
