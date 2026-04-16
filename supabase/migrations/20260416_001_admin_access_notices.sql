-- =============================================
-- Migration: Voeg 'admin_access' toe als action_feed-type
-- voor AVG-transparantie (gebruiker ziet wanneer admin
-- toegang heeft genomen via impersonatie).
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
    'deadline_alert',
    'admin_access'
  ));
