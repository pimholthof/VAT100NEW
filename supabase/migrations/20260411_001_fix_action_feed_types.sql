-- =============================================
-- Migration: Fix action_feed_type_check constraint
-- Voegt ontbrekende types 'autonomous_match' en 'deadline_alert' toe
-- die al door de code worden geïnsert maar niet in de constraint stonden.
-- =============================================

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
    'quote_expired',
    'autonomous_match',
    'deadline_alert'
  ));
