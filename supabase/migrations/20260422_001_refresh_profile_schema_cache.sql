-- ============================================================================
-- Herstel: fiscale profielvelden + schema-cache reload
--
-- Migratie 20260410_004 voegde estimated_annual_income, uses_kor en
-- meets_urencriterium toe aan public.profiles. Op sommige omgevingen bleef
-- PostgREST's schema-cache echter verouderd, waardoor de instellingenpagina
-- faalt met "Could not find the 'estimated_annual_income' column of
-- 'profiles' in the schema cache".
--
-- Deze migratie is idempotent: ze past de kolommen opnieuw toe indien nodig
-- en forceert een reload van de PostgREST schema-cache.
-- ============================================================================

alter table public.profiles
  add column if not exists uses_kor boolean default false;

alter table public.profiles
  add column if not exists estimated_annual_income numeric(12, 2);

alter table public.profiles
  add column if not exists meets_urencriterium boolean default true;

-- Forceer PostgREST om de schema-cache opnieuw te laden.
notify pgrst, 'reload schema';
