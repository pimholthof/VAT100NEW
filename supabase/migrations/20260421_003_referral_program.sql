-- ============================================================================
-- Referral program — CAC-verlaging via K-factor
--
-- Iedere gebruiker krijgt een unieke referral-code. Elke nieuwe klant die
-- hiermee tekent krijgt de eerste maand gratis; de verwijzer krijgt ook
-- één maand krediet op zijn subscription.
-- ============================================================================

-- Referral-code per gebruiker
alter table public.profiles
  add column if not exists referral_code text unique;

-- Auto-genereer referral_code voor bestaande + nieuwe profielen
create or replace function public.generate_referral_code()
returns text language plpgsql as $$
declare
  v_code text;
  v_attempts integer := 0;
begin
  loop
    -- 8-char alphanumeric, uppercase
    v_code := upper(substr(encode(gen_random_bytes(6), 'base64'), 1, 8));
    v_code := regexp_replace(v_code, '[^A-Z0-9]', 'X', 'g');

    exit when not exists (select 1 from public.profiles where referral_code = v_code);
    v_attempts := v_attempts + 1;
    if v_attempts > 10 then
      raise exception 'Kon geen unieke referral-code genereren';
    end if;
  end loop;
  return v_code;
end;
$$;

-- Backfill bestaande gebruikers
update public.profiles
set referral_code = public.generate_referral_code()
where referral_code is null;

-- Trigger voor nieuwe profielen
create or replace function public.set_referral_code_on_insert()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_set_referral_code on public.profiles;
create trigger profiles_set_referral_code
  before insert on public.profiles
  for each row execute function public.set_referral_code_on_insert();

-- Referral-relaties + beloningen
create table if not exists public.referrals (
  id                uuid        primary key default gen_random_uuid(),
  referrer_user_id  uuid        not null references public.profiles (id) on delete cascade,
  referred_user_id  uuid        not null references public.profiles (id) on delete cascade unique,
  referrer_reward_months integer not null default 1,
  referred_reward_months integer not null default 1,
  status            text        not null default 'pending'
                                check (status in ('pending', 'qualified', 'rewarded', 'expired')),
  qualified_at      timestamptz,
  rewarded_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_referrals_referrer on public.referrals (referrer_user_id);
create index if not exists idx_referrals_status on public.referrals (status);

alter table public.referrals enable row level security;

create policy "Users can view their own referrals"
  on public.referrals for select
  using (auth.uid() = referrer_user_id or auth.uid() = referred_user_id);
