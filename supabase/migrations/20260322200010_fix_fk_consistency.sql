-- ═══════════════════════════════════════════════════════════════════
-- Fix FK consistentie: annual_accounts en action_feed
-- Beide refereren auth.users(id) i.p.v. profiles(id)
-- ═══════════════════════════════════════════════════════════════════

-- ─── annual_accounts: hermaak FK naar profiles ────────────────────
-- NB: auth.users(id) → profiles(id) cascade is functioneel gelijk,
-- maar we standaardiseren voor consistentie en onderhoudbaarheid.

-- Verwijder oude FK constraint (naam kan variëren, dus we zoeken en droppen)
alter table annual_accounts
  drop constraint if exists annual_accounts_user_id_fkey;

alter table annual_accounts
  add constraint annual_accounts_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

-- ─── action_feed: hermaak FK naar profiles ────────────────────────

alter table action_feed
  drop constraint if exists action_feed_user_id_fkey;

alter table action_feed
  add constraint action_feed_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

-- ─── counterpart_iban toevoegen aan bank_transactions ─────────────
-- TypeScript type verwacht dit veld, en banking.ts schrijft het al weg

alter table bank_transactions
  add column if not exists counterpart_iban text;
