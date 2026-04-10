-- ============================================================================
-- 20260324_007: Unique invoice numbers per user + atomic generation function
-- ============================================================================
-- Fixes:
--   1. Missing unique constraint: two invoices could share the same number
--   2. Race condition in generateInvoiceNumber: concurrent requests could
--      generate the same number
-- ============================================================================

-- 1. Unique index on (user_id, invoice_number)
--    This guarantees no duplicate invoice numbers within a single user,
--    even if the application layer has a bug.
create unique index if not exists idx_invoices_user_number
  on public.invoices (user_id, invoice_number);

-- 2. Atomic invoice number generation function
--    Uses SELECT ... FOR UPDATE–style locking via advisory lock to prevent
--    two concurrent calls from reading the same max number.
--    Returns a zero-padded 4-digit string (e.g. "0031").
create or replace function public.generate_invoice_number(p_user_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_max_number int;
  v_next_number int;
begin
  -- Take an advisory lock scoped to this user so concurrent calls are
  -- serialised.  hashtext() turns the uuid into a stable int for pg_advisory_xact_lock.
  perform pg_advisory_xact_lock(hashtext(p_user_id::text));

  -- Find the highest numeric invoice number for this user
  select coalesce(max(nullif(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '')::int), 0)
    into v_max_number
    from public.invoices
   where user_id = p_user_id;

  v_next_number := v_max_number + 1;

  return lpad(v_next_number::text, 4, '0');
end;
$$;

-- Grant execute to authenticated users (Supabase convention)
grant execute on function public.generate_invoice_number(uuid) to authenticated;
