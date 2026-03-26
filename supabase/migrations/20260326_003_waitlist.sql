-- ============================================================================
-- Waitlist table for pre-launch signups
-- ============================================================================

create table if not exists public.waitlist (
  id          uuid        primary key default gen_random_uuid(),
  email       text        not null unique,
  name        text,
  referral    text,
  created_at  timestamptz not null default now()
);

comment on table public.waitlist is 'Pre-launch waitlist signups.';

-- No RLS — accessed only via service client from server actions
create index if not exists idx_waitlist_email on public.waitlist (email);
create index if not exists idx_waitlist_created on public.waitlist (created_at desc);
