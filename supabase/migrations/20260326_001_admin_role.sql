-- ============================================================================
-- Admin role + account status on profiles
-- ============================================================================

-- Add role column: 'user' (default) or 'admin'
alter table public.profiles
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin'));

-- Add status column: 'active' (default) or 'suspended'
alter table public.profiles
  add column if not exists status text not null default 'active'
    check (status in ('active', 'suspended'));

-- Index for quick admin lookups
create index if not exists idx_profiles_role on public.profiles (role);


-- ============================================================================
-- Rate limits table (for serverless-safe rate limiting)
-- ============================================================================

create table if not exists public.rate_limits (
  id          uuid        primary key default gen_random_uuid(),
  key         text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_rate_limits_key_created
  on public.rate_limits (key, created_at);

-- No RLS needed — accessed only via service client
