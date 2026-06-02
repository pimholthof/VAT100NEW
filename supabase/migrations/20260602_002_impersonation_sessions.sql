-- Impersonation-auditspoor: tamper-proof sessies met start, eind, duur, IP en
-- user-agent. Voor AVG-accountability bij toegang tot financiële data.

create table if not exists public.impersonation_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id),
  impersonated_user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ip_address text,
  user_agent text,
  reason text
);

alter table public.impersonation_sessions enable row level security;

-- Alleen admins lezen; inserts/updates lopen via de service-role (bypass RLS).
create policy "Admins read impersonation sessions"
  on public.impersonation_sessions for select
  using (public.is_admin());

create index if not exists idx_impersonation_admin
  on public.impersonation_sessions (admin_id, started_at desc);
create index if not exists idx_impersonation_active
  on public.impersonation_sessions (admin_id) where ended_at is null;

-- Tamper-guard: een sessie is onveranderlijk, behalve dat ended_at één keer
-- van NULL naar een waarde mag worden gezet. Zo kan een afgesloten sessie niet
-- worden herschreven of de duur worden gemanipuleerd.
create or replace function public.guard_impersonation_session()
returns trigger language plpgsql as $$
begin
  if old.ended_at is not null then
    raise exception 'Beëindigde impersonatie-sessie is onveranderlijk.';
  end if;
  if new.admin_id is distinct from old.admin_id
     or new.impersonated_user_id is distinct from old.impersonated_user_id
     or new.started_at is distinct from old.started_at
     or new.ip_address is distinct from old.ip_address
     or new.user_agent is distinct from old.user_agent then
    raise exception 'Alleen ended_at mag worden gezet op een impersonatie-sessie.';
  end if;
  return new;
end;
$$;

create trigger trg_impersonation_guard
  before update on public.impersonation_sessions
  for each row execute function public.guard_impersonation_session();
