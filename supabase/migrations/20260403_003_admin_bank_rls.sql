-- Admin read access to bank data
create policy "Admins can view all bank connections"
  on public.bank_connections for select
  using (public.is_admin());

create policy "Admins can view all bank transactions"
  on public.bank_transactions for select
  using (public.is_admin());
