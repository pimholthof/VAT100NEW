-- ============================================================================
-- Admin RLS policies — allow admins to read ALL data across users
-- ============================================================================

-- Helper function: check if current user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;


-- PROFILES: admin can view all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());


-- CLIENTS: admin can view all clients
create policy "Admins can view all clients"
  on public.clients for select
  using (public.is_admin());


-- INVOICES: admin can view all invoices
create policy "Admins can view all invoices"
  on public.invoices for select
  using (public.is_admin());


-- INVOICE LINES: admin can view all invoice lines
create policy "Admins can view all invoice lines"
  on public.invoice_lines for select
  using (public.is_admin());


-- RECEIPTS: admin can view all receipts
create policy "Admins can view all receipts"
  on public.receipts for select
  using (public.is_admin());
