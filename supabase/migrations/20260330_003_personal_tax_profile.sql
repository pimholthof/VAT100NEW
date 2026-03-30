-- ============================================================================
-- VAT100 — Personal Tax Profile
-- Personal deductions for more accurate IB estimation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.personal_tax_profiles (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year                      integer     NOT NULL DEFAULT 2026,

  -- Hypotheek / eigen woning
  hypotheekrente_per_jaar   numeric(10,2) NOT NULL DEFAULT 0,
  woz_waarde                numeric(12,2) NOT NULL DEFAULT 0,

  -- Partner
  heeft_partner             boolean     NOT NULL DEFAULT false,
  partner_inkomen           numeric(10,2) NOT NULL DEFAULT 0,

  -- Aftrekposten
  giften                    numeric(10,2) NOT NULL DEFAULT 0,
  zorgkosten                numeric(10,2) NOT NULL DEFAULT 0,
  studiekosten              numeric(10,2) NOT NULL DEFAULT 0,
  alimentatie               numeric(10,2) NOT NULL DEFAULT 0,

  -- Voorlopige aanslag
  voorlopige_aanslag_ib     numeric(10,2) NOT NULL DEFAULT 0,
  voorlopige_aanslag_zvw    numeric(10,2) NOT NULL DEFAULT 0,

  -- Overig
  andere_inkomsten          numeric(10,2) NOT NULL DEFAULT 0,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  UNIQUE(user_id, year)
);

ALTER TABLE public.personal_tax_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tax profile"
  ON public.personal_tax_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tax profile"
  ON public.personal_tax_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tax profile"
  ON public.personal_tax_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tax profile"
  ON public.personal_tax_profiles FOR DELETE
  USING (auth.uid() = user_id);
