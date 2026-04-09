ALTER TABLE public.system_events
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_token UUID,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_system_events_claimable
  ON public.system_events (created_at)
  WHERE processed_at IS NULL AND failed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_system_events_processing_token
  ON public.system_events (processing_token)
  WHERE processing_token IS NOT NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS source_recurring_invoice_id UUID REFERENCES public.recurring_invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_run_date DATE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_recurring_run_unique
  ON public.invoices (source_recurring_invoice_id, source_run_date)
  WHERE source_recurring_invoice_id IS NOT NULL AND source_run_date IS NOT NULL;
