-- ═══════════════════════════════════════════════════════════════════
-- Historische belastingtarieven per boekjaar
-- Vervangt hardcoded waarden in lib/tax.ts
-- ═══════════════════════════════════════════════════════════════════

create table tax_rates (
  id                           uuid primary key default gen_random_uuid(),
  fiscal_year                  integer not null,
  bracket_order                integer not null,
  bracket_start                numeric(12,2) not null,
  bracket_end                  numeric(12,2),        -- null = oneindig
  rate                         numeric(6,4) not null, -- bijv. 0.3582
  zelfstandigenaftrek           numeric(10,2) not null,
  mkb_vrijstelling_rate        numeric(6,4) not null, -- bijv. 0.1331
  heffingskorting_max           numeric(10,2) not null,
  heffingskorting_afbouw_start  numeric(10,2) not null,
  heffingskorting_afbouw_rate   numeric(6,4) not null,
  created_at                   timestamptz not null default now(),
  unique(fiscal_year, bracket_order)
);

alter table tax_rates enable row level security;

-- Iedereen mag tarieven lezen (publieke data)
create policy "tax_rates_select"
  on tax_rates for select
  using (true);

-- Alleen service role mag schrijven (geen user INSERT/UPDATE/DELETE policies)

create index idx_tax_rates_year
  on tax_rates (fiscal_year);

-- ─── Seed 2025 tarieven ────────────────────────────────────────────

insert into tax_rates (fiscal_year, bracket_order, bracket_start, bracket_end, rate, zelfstandigenaftrek, mkb_vrijstelling_rate, heffingskorting_max, heffingskorting_afbouw_start, heffingskorting_afbouw_rate)
values
  (2025, 1, 0, 38441, 0.3582, 7390, 0.1331, 3362, 24814, 0.0663),
  (2025, 2, 38441, 76817, 0.3748, 7390, 0.1331, 3362, 24814, 0.0663),
  (2025, 3, 76817, null,  0.4950, 7390, 0.1331, 3362, 24814, 0.0663);
