-- ============================================================================
-- Onboarding progress tracking & fiscal profile fields
-- ============================================================================

-- Onboarding progress (persistent checklist state)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

-- Fiscal profile: BTW frequency for deadline calculations
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vat_frequency TEXT DEFAULT 'quarterly'
    CHECK (vat_frequency IN ('monthly', 'quarterly', 'yearly'));

-- Fiscal profile: when the user starts using VAT100
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bookkeeping_start_date DATE;
