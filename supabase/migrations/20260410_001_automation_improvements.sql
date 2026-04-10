-- =============================================
-- Migration: Automation improvements
-- Stap 2a: quotes.sent_at
-- Stap 2b: action_feed.related_quote_id + quote_expired type
-- Stap 2b: quotes.status 'expired' toevoegen
-- =============================================

-- 1. Voeg sent_at toe aan quotes
alter table quotes
  add column if not exists sent_at timestamptz;

-- 2. Voeg related_quote_id toe aan action_feed
alter table action_feed
  add column if not exists related_quote_id uuid references quotes(id) on delete set null;

-- 3. Vervang type constraint zodat nieuwe types toegestaan zijn
alter table action_feed
  drop constraint if exists action_feed_type_check;

alter table action_feed
  add constraint action_feed_type_check
  check (type in (
    'missing_receipt',
    'match_suggestion',
    'tax_alert',
    'uncategorized',
    'reminder_suggestion',
    'bookkeeping_alert',
    'quote_expired'
  ));

-- 4. Voeg 'expired' toe aan quotes status constraint
alter table quotes
  drop constraint if exists quotes_status_check;

alter table quotes
  add constraint quotes_status_check
  check (status in ('draft', 'sent', 'accepted', 'rejected', 'invoiced', 'expired'));
