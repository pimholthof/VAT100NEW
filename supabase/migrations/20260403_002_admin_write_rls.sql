-- ============================================================================
-- Admin WRITE RLS policies — allow admins to UPDATE/INSERT/DELETE customer data
-- ============================================================================

-- PROFILES: admin can update all profiles
create policy "Admins can update all profiles"
  on public.profiles for update
  using (public.is_admin());

-- CLIENTS: admin can manage all clients
create policy "Admins can update all clients"
  on public.clients for update
  using (public.is_admin());

create policy "Admins can insert clients"
  on public.clients for insert
  with check (public.is_admin());

create policy "Admins can delete clients"
  on public.clients for delete
  using (public.is_admin());

-- INVOICES: admin can manage all invoices
create policy "Admins can update all invoices"
  on public.invoices for update
  using (public.is_admin());

create policy "Admins can insert invoices"
  on public.invoices for insert
  with check (public.is_admin());

create policy "Admins can delete invoices"
  on public.invoices for delete
  using (public.is_admin());

-- INVOICE LINES: admin can manage all invoice lines
create policy "Admins can update all invoice lines"
  on public.invoice_lines for update
  using (public.is_admin());

create policy "Admins can insert invoice lines"
  on public.invoice_lines for insert
  with check (public.is_admin());

create policy "Admins can delete invoice lines"
  on public.invoice_lines for delete
  using (public.is_admin());

-- RECEIPTS: admin can manage all receipts
create policy "Admins can update all receipts"
  on public.receipts for update
  using (public.is_admin());

create policy "Admins can insert receipts"
  on public.receipts for insert
  with check (public.is_admin());

create policy "Admins can delete receipts"
  on public.receipts for delete
  using (public.is_admin());
