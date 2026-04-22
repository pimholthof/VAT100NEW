-- ============================================================================
-- Digipoort filings — directe BTW/IB-aangifte via SBR-Banking
--
-- Dit is de moat van Moneybird/Exact. Plus-tier (€149/mnd) differentieert
-- hierop: klanten drukken op één knop en de aangifte gaat via Digipoort
-- rechtstreeks naar de Belastingdienst.
-- ============================================================================

create table if not exists public.digipoort_filings (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references public.profiles (id) on delete cascade,
  filing_type         text        not null
                                  check (filing_type in ('btw_aangifte', 'btw_icp', 'ib_aangifte')),
  period              text        not null,  -- bv. '2026Q1', '2026'
  status              text        not null default 'draft'
                                  check (status in ('draft', 'submitted', 'accepted', 'rejected', 'error')),
  digipoort_reference text,                  -- kenmerk/ontvangstbevestiging
  payload_xbrl        text,                  -- verzonden XBRL-instantiedocument
  response_payload    jsonb,                  -- volledige Digipoort response
  submitted_at        timestamptz,
  accepted_at         timestamptz,
  error_message       text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, filing_type, period)
);

create index if not exists idx_digipoort_user on public.digipoort_filings (user_id);
create index if not exists idx_digipoort_status on public.digipoort_filings (status);

alter table public.digipoort_filings enable row level security;

create policy "Users can view own filings"
  on public.digipoort_filings for select
  using (auth.uid() = user_id);

create policy "Users can create own filings"
  on public.digipoort_filings for insert
  with check (auth.uid() = user_id);
