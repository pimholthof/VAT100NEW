-- ═══════════════════════════════════════════════════════════════════
-- BTW-tarief per factuurregel i.p.v. per factuur
-- Maakt mixed-rate facturen mogelijk (bijv. 21% + 9% op dezelfde factuur)
-- ═══════════════════════════════════════════════════════════════════

alter table invoice_lines
  add column if not exists vat_rate numeric(5,2) not null default 21;

-- Kopieer huidige factuur-level vat_rate naar alle bestaande regels
update invoice_lines il
set vat_rate = coalesce(
  (select i.vat_rate from invoices i where i.id = il.invoice_id),
  21
)
where il.vat_rate = 21; -- Alleen updaten als nog default

-- Voeg per-regel VAT bedragen toe
alter table invoice_lines
  add column if not exists vat_amount numeric(10,2) not null default 0;

alter table invoice_lines
  add column if not exists amount_inc_vat numeric(10,2) not null default 0;

-- Bereken bestaande regels
update invoice_lines
set
  vat_amount = round(amount * vat_rate / 100, 2),
  amount_inc_vat = amount + round(amount * vat_rate / 100, 2);
