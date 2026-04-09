-- Reserve Snapshots: tracks safe-to-spend recalculations triggered by
-- transaction classification, bank sync, or manual refresh.

CREATE TABLE IF NOT EXISTS public.reserve_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bank_balance numeric(12,2) NOT NULL DEFAULT 0,
  estimated_vat numeric(12,2) NOT NULL DEFAULT 0,
  estimated_income_tax numeric(12,2) NOT NULL DEFAULT 0,
  reserved_total numeric(12,2) NOT NULL DEFAULT 0,
  safe_to_spend numeric(12,2) NOT NULL DEFAULT 0,
  trigger_type text NOT NULL DEFAULT 'manual', -- 'classification', 'sync', 'manual'
  trigger_transaction_id uuid REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_reserve_snapshots_user ON public.reserve_snapshots(user_id, created_at DESC);

ALTER TABLE public.reserve_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own snapshots"
  ON public.reserve_snapshots FOR SELECT
  USING (auth.uid() = user_id);
