-- ═══════════════════════════════════════════════════════════════════
-- Add CHECK constraints for data integrity
-- ═══════════════════════════════════════════════════════════════════

-- ─── Factuur: due_date moet na issue_date ──────────────────────────
alter table invoices add constraint chk_due_after_issue
  check (due_date is null or due_date >= issue_date);

-- ─── Factuur: totalen moeten kloppen ───────────────────────────────
alter table invoices add constraint chk_invoice_totals
  check (total_inc_vat = subtotal_ex_vat + vat_amount);

-- ─── BTW-aangifte: periodes moeten kloppen ─────────────────────────
alter table vat_returns add constraint chk_period_order
  check (period_end >= period_start);

-- ─── BTW-aangifte: berekening moet kloppen ─────────────────────────
alter table vat_returns add constraint chk_vat_due
  check (vat_due = output_vat - input_vat);

-- ─── Assets: restwaarde mag niet hoger zijn dan aanschafwaarde ─────
alter table assets add constraint chk_residual_value
  check (residual_value <= acquisition_cost);

-- ─── Receipts: categorieen beperken per CLAUDE.md ──────────────────
alter table receipts add constraint chk_receipt_category
  check (category in (
    'Software', 'Hardware', 'Kantoor', 'Reizen',
    'Marketing', 'Eten & Drinken', 'Overig'
  ) or category is null);

-- ─── Tax reservations: period format constrainen ───────────────────
alter table tax_reservations add constraint chk_period_format
  check (period ~ '^Q[1-4] \d{4}$');

-- ─── Factuur bedragen niet-negatief ────────────────────────────────
alter table invoices add constraint chk_subtotal_positive
  check (subtotal_ex_vat >= 0);

alter table invoices add constraint chk_vat_amount_positive
  check (vat_amount >= 0);
