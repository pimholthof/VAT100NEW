-- =============================================
-- Migration: Dead Letter Queue voor gefaalde system_events
-- Events die na 3 pogingen falen worden hierheen verplaatst
-- met volledige failure context voor replay en debugging.
-- =============================================

create table if not exists system_events_dlq (
  id uuid primary key default gen_random_uuid(),
  original_event_id uuid not null,
  event_type text not null,
  payload jsonb,
  user_id uuid references profiles(id) on delete set null,
  attempts int not null default 0,
  last_error text,
  failed_at timestamptz not null default now(),
  replayed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Index voor admin overzicht en replay
create index if not exists idx_dlq_unreplayed
  on system_events_dlq (failed_at desc)
  where replayed_at is null;

-- RLS: alleen admins
alter table system_events_dlq enable row level security;

create policy "Admins can manage DLQ"
  on system_events_dlq
  for all
  using ((select role from profiles where id = auth.uid()) = 'admin');
