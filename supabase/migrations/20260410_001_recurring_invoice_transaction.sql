-- Atomic recurring invoice creation.
-- Replaces the multi-step flow (insert invoice → insert lines → update template)
-- with a single transactional function. Includes idempotency check.

CREATE OR REPLACE FUNCTION create_recurring_invoice(
  p_user_id UUID,
  p_client_id UUID,
  p_template_id UUID,
  p_run_date DATE,
  p_invoice_number TEXT,
  p_status TEXT,
  p_issue_date DATE,
  p_due_date DATE,
  p_vat_rate NUMERIC,
  p_notes TEXT,
  p_subtotal_ex_vat NUMERIC,
  p_vat_amount NUMERIC,
  p_total_inc_vat NUMERIC,
  p_next_run_date DATE,
  p_lines JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id UUID;
  v_line JSONB;
  v_index INTEGER := 0;
  v_existing UUID;
BEGIN
  -- Idempotency: check if invoice already exists for this template+run_date
  SELECT id INTO v_existing FROM invoices
    WHERE source_recurring_invoice_id = p_template_id
    AND source_run_date = p_run_date;

  IF v_existing IS NOT NULL THEN
    -- Already created — just advance the template
    UPDATE recurring_invoices SET
      next_run_date = p_next_run_date,
      last_generated_at = now()
    WHERE id = p_template_id;
    RETURN v_existing;
  END IF;

  -- Create invoice
  INSERT INTO invoices (
    user_id, client_id, source_recurring_invoice_id, source_run_date,
    invoice_number, status, issue_date, due_date, vat_rate,
    subtotal_ex_vat, vat_amount, total_inc_vat, notes
  ) VALUES (
    p_user_id, p_client_id, p_template_id, p_run_date,
    p_invoice_number, p_status, p_issue_date, p_due_date, p_vat_rate,
    p_subtotal_ex_vat, p_vat_amount, p_total_inc_vat, p_notes
  ) RETURNING id INTO v_invoice_id;

  -- Insert lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO invoice_lines (
      invoice_id, description, quantity, unit, rate, amount, sort_order
    ) VALUES (
      v_invoice_id,
      v_line->>'description',
      (v_line->>'quantity')::NUMERIC,
      v_line->>'unit',
      (v_line->>'rate')::NUMERIC,
      (v_line->>'amount')::NUMERIC,
      v_index
    );
    v_index := v_index + 1;
  END LOOP;

  -- Advance template to next run
  UPDATE recurring_invoices SET
    next_run_date = p_next_run_date,
    last_generated_at = now()
  WHERE id = p_template_id;

  RETURN v_invoice_id;
END;
$$;
