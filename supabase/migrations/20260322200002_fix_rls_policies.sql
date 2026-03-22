-- ═══════════════════════════════════════════════════════════════════
-- Fix RLS policies: with check gaps, advisor invoice_lines,
-- delete restrictions on financial records, advisor self-assignment
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Fix categorization_rules UPDATE policy (ontbrekende with check) ───

drop policy if exists "Users can update own rules" on categorization_rules;
create policy "Users can update own rules"
  on categorization_rules for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── 2. Advisor leesrechten op invoice_lines ──────────────────────

create policy "advisor leest invoice_lines"
  on invoice_lines for select
  using (
    exists (
      select 1 from invoices i
      join advisor_clients ac on ac.client_user_id = i.user_id
      where i.id = invoice_lines.invoice_id
        and ac.advisor_id = auth.uid()
        and ac.status = 'active'
    )
  );

-- ─── 3. DELETE-beperking: alleen draft facturen verwijderbaar ──────

drop policy if exists "Users can delete own invoices" on invoices;
create policy "Users can delete draft invoices"
  on invoices for delete
  using (auth.uid() = user_id and status = 'draft');

-- ─── 4. DELETE-beperking: alleen concept vat_returns verwijderbaar ─

-- Vervang de all-in-one policy door aparte policies per operatie
drop policy if exists "eigen vat_returns" on vat_returns;

create policy "vat_returns_select"
  on vat_returns for select
  using (auth.uid() = user_id);

create policy "vat_returns_insert"
  on vat_returns for insert
  with check (auth.uid() = user_id);

create policy "vat_returns_update"
  on vat_returns for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vat_returns_delete"
  on vat_returns for delete
  using (auth.uid() = user_id and status = 'concept');

-- ─── 5. DELETE-beperking: alleen concept tax_reservations ──────────

drop policy if exists "eigen tax_reservations" on tax_reservations;

create policy "tax_reservations_select"
  on tax_reservations for select
  using (auth.uid() = user_id);

create policy "tax_reservations_insert"
  on tax_reservations for insert
  with check (auth.uid() = user_id);

create policy "tax_reservations_update"
  on tax_reservations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "tax_reservations_delete"
  on tax_reservations for delete
  using (auth.uid() = user_id);

-- ─── 6. Fix advisor self-assignment kwetsbaarheid ──────────────────
-- Vervang de all-in-one policy door aparte policies.
-- Advisors mogen alleen LEZEN, niet zelf koppelen.

drop policy if exists "advisor ziet eigen koppelingen" on advisor_clients;

-- Advisor kan eigen koppelingen zien (SELECT only)
create policy "advisor_clients_select"
  on advisor_clients for select
  using (auth.uid() = advisor_id);

-- Advisor kan status updaten (bijv. accepteren/revoken)
create policy "advisor_clients_update"
  on advisor_clients for update
  using (auth.uid() = advisor_id)
  with check (auth.uid() = advisor_id);

-- Alleen de CLIENT kan een advisor-koppeling aanmaken
create policy "client_creates_advisor_link"
  on advisor_clients for insert
  with check (auth.uid() = client_user_id);

-- Alleen de CLIENT kan een advisor-koppeling verwijderen
create policy "client_deletes_advisor_link"
  on advisor_clients for delete
  using (auth.uid() = client_user_id);

-- ─── 7. Fix action_feed UPDATE policy (ontbrekende with check) ────

drop policy if exists "Users can update own action_feed items" on action_feed;
create policy "Users can update own action_feed items"
  on action_feed for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
