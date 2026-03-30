-- ============================================================================
-- VAT100 — Coach Messages & Suggestions
-- Personal coaching from bookkeeper to users.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coach_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_name     text        NOT NULL DEFAULT 'Pim',
  subject         text,
  body            text        NOT NULL,
  is_read         boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coach messages"
  ON public.coach_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own coach messages"
  ON public.coach_messages FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_coach_messages_user ON public.coach_messages (user_id, created_at DESC);
CREATE INDEX idx_coach_messages_unread ON public.coach_messages (user_id) WHERE is_read = false;

-- Coach suggestions (system-generated signals for the admin/bookkeeper)
CREATE TABLE IF NOT EXISTS public.coach_suggestions (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  suggestion_type   text        NOT NULL CHECK (suggestion_type IN (
    'missing_receipts', 'uncategorized_items', 'tax_deadline',
    'bank_error', 'incomplete_profile', 'milestone'
  )),
  title             text        NOT NULL,
  context           text        NOT NULL,
  is_acted_on       boolean     NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_suggestions ENABLE ROW LEVEL SECURITY;

-- Only admin can see suggestions (via service role), but add basic policy
CREATE POLICY "Users can view own suggestions"
  ON public.coach_suggestions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_coach_suggestions_pending ON public.coach_suggestions (is_acted_on, created_at DESC)
  WHERE is_acted_on = false;
