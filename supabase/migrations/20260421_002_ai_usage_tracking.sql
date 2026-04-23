-- ============================================================================
-- AI usage tracking — marge-bescherming via hard-quota per plan
-- ============================================================================

create table if not exists public.ai_usage (
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  period_start date        not null,
  ocr_count    integer     not null default 0,
  chat_count   integer     not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, period_start)
);

create index if not exists idx_ai_usage_period
  on public.ai_usage (period_start);

alter table public.ai_usage enable row level security;

create policy "Users can view own AI usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

-- Atomic increment RPC: voorkomt race tussen gelijktijdige requests.
-- Geeft nieuwe count terug; caller beslist of deze boven limiet uitkomt.
create or replace function public.consume_ai_quota(
  p_user_id      uuid,
  p_period_start date,
  p_kind         text,
  p_limit        integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
begin
  if p_kind not in ('ocr_count', 'chat_count') then
    raise exception 'Invalid usage kind: %', p_kind;
  end if;

  if p_kind = 'ocr_count' then
    insert into public.ai_usage (user_id, period_start, ocr_count)
    values (p_user_id, p_period_start, 1)
    on conflict (user_id, period_start) do update
      set ocr_count = public.ai_usage.ocr_count + 1,
          updated_at = now()
    returning ocr_count into v_new_count;
  else
    insert into public.ai_usage (user_id, period_start, chat_count)
    values (p_user_id, p_period_start, 1)
    on conflict (user_id, period_start) do update
      set chat_count = public.ai_usage.chat_count + 1,
          updated_at = now()
    returning chat_count into v_new_count;
  end if;

  return v_new_count;
end;
$$;

revoke all on function public.consume_ai_quota(uuid, date, text, integer) from public;
grant execute on function public.consume_ai_quota(uuid, date, text, integer) to authenticated, service_role;
