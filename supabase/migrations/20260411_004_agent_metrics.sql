-- =============================================
-- Migration: Agent Performance Metrics
-- Tracked per-agent execution time, success rate, en error context.
-- =============================================

create table if not exists agent_metrics (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  event_id uuid,
  event_type text,
  user_id uuid references profiles(id) on delete set null,
  execution_ms int not null,
  success boolean not null,
  error_message text,
  created_at timestamptz not null default now()
);

-- Index voor performance dashboards
create index if not exists idx_agent_metrics_name_created
  on agent_metrics (agent_name, created_at desc);

-- RLS: alleen admins
alter table agent_metrics enable row level security;

create policy "Admins can read agent metrics"
  on agent_metrics
  for select
  using ((select role from profiles where id = auth.uid()) = 'admin');
