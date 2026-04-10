-- ============================================================================
-- Predictive Calm: Fiscale profielvelden voor onboarding
-- ============================================================================

-- KOR (Kleineondernemersregeling) — BTW-vrijstelling bij omzet < €20.000
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS uses_kor BOOLEAN DEFAULT false;

-- Geschat jaarinkomen — gebruikt voor belastingreservering
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS estimated_annual_income NUMERIC(12,2);

-- Urencriterium — ≥1.225 uur/jaar als ondernemer
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS meets_urencriterium BOOLEAN DEFAULT true;
