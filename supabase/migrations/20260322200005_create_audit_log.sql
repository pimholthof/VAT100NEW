-- ═══════════════════════════════════════════════════════════════════
-- Audit log: append-only controlespoor voor financiele tabellen
-- Vereist voor Belastingdienst compliance bij digitale boekhouding
-- ═══════════════════════════════════════════════════════════════════

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  table_name  text not null,
  record_id   uuid not null,
  action      text not null check (action in ('insert', 'update', 'delete')),
  old_data    jsonb,
  new_data    jsonb,
  created_at  timestamptz not null default now()
);

alter table audit_log enable row level security;

-- Gebruikers mogen alleen lezen (append-only)
create policy "audit_log_select"
  on audit_log for select
  using (auth.uid() = user_id);

-- Advisors mogen audit logs lezen van gekoppelde klanten
create policy "advisor_leest_audit_log"
  on audit_log for select
  using (
    exists (
      select 1 from advisor_clients ac
      where ac.advisor_id = auth.uid()
        and ac.client_user_id = audit_log.user_id
        and ac.status = 'active'
    )
  );

-- Indexes
create index idx_audit_log_user_table
  on audit_log (user_id, table_name, created_at desc);

create index idx_audit_log_record
  on audit_log (record_id, created_at desc);

-- ─── Generieke audit trigger functie ───────────────────────────────

create or replace function audit_trigger_fn()
returns trigger language plpgsql security definer as $$
declare
  v_user_id uuid;
  v_record_id uuid;
begin
  -- Bepaal user_id en record_id afhankelijk van de operatie
  if TG_OP = 'DELETE' then
    v_user_id := OLD.user_id;
    v_record_id := OLD.id;
    insert into audit_log (user_id, table_name, record_id, action, old_data)
    values (v_user_id, TG_TABLE_NAME, v_record_id, 'delete', to_jsonb(OLD));
    return OLD;
  elsif TG_OP = 'UPDATE' then
    v_user_id := NEW.user_id;
    v_record_id := NEW.id;
    insert into audit_log (user_id, table_name, record_id, action, old_data, new_data)
    values (v_user_id, TG_TABLE_NAME, v_record_id, 'update', to_jsonb(OLD), to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'INSERT' then
    v_user_id := NEW.user_id;
    v_record_id := NEW.id;
    insert into audit_log (user_id, table_name, record_id, action, new_data)
    values (v_user_id, TG_TABLE_NAME, v_record_id, 'insert', to_jsonb(NEW));
    return NEW;
  end if;
  return null;
end;
$$;

-- ─── Audit triggers op financiele tabellen ─────────────────────────

create trigger trg_audit_invoices
  after insert or update or delete on invoices
  for each row execute function audit_trigger_fn();

create trigger trg_audit_receipts
  after insert or update or delete on receipts
  for each row execute function audit_trigger_fn();

create trigger trg_audit_vat_returns
  after insert or update or delete on vat_returns
  for each row execute function audit_trigger_fn();

create trigger trg_audit_tax_reservations
  after insert or update or delete on tax_reservations
  for each row execute function audit_trigger_fn();

-- NB: audit trigger voor payments en credit_notes wordt aangemaakt
-- in hun eigen migraties (200008/200009)
