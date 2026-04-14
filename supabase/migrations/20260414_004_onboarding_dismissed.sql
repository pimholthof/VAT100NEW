-- Allow users to persistently dismiss the onboarding checklist
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_dismissed_at TIMESTAMPTZ;
