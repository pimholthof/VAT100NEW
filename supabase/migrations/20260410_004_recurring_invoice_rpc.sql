-- Atomic RPC for generating recurring invoices with idempotency.
-- This function handles duplicate prevention and atomic invoice creation
-- to ensure no double-invoicing even under concurrent execution.

CREATE OR REPLACE FUNCTION generate_recurring_invoice(
  p_template_id UUID,
  p_run_date DATE,
  p_next_run_date DATE,
  p_invoice_number TEXT,
  p_today DATE,
  p_due_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id UUID;
  v_template RECORD;
  v_line RECORD;
  v_subtotal NUMERIC := 0;
  v_vat_amount NUMERIC := 0;
  v_total NUMERIC := 0;
  v_line_amount NUMERIC;
  v_index INTEGER := 0;
BEGIN
  -- Lock the template to prevent concurrent processing
  SELECT * INTO v_template
  FROM recurring_invoices
  WHERE id = p_template_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  -- Check if invoice already exists for this run date (idempotency)
  SELECT id INTO v_invoice_id
  FROM invoices
  WHERE source_recurring_invoice_id = p_template_id
    AND source_run_date = p_run_date
  LIMIT 1;

  IF v_invoice_id IS NOT NULL THEN
    -- Already exists, just update the template's next_run_date
    UPDATE recurring_invoices
    SET next_run_date = p_next_run_date,
        last_generated_at = NOW()
    WHERE id = p_template_id;
    
    RETURN v_invoice_id;
  END IF;

  -- Calculate totals from template lines
  FOR v_line IN 
    SELECT * FROM recurring_invoice_lines 
    WHERE recurring_invoice_id = p_template_id 
    ORDER BY sort_order
  LOOP
    v_line_amount := ROUND((v_line.quantity * v_line.rate)::NUMERIC, 2);
    v_subtotal := v_subtotal + v_line_amount;
  END LOOP;

  v_vat_amount := ROUND(v_subtotal * (v_template.vat_rate / 100), 2);
  v_total := v_subtotal + v_vat_amount;

  -- Create the invoice
  INSERT INTO invoices (
    user_id,
    client_id,
    source_recurring_invoice_id,
    source_run_date,
    invoice_number,
    status,
    issue_date,
    due_date,
    vat_rate,
    vat_scheme,
    subtotal_ex_vat,
    vat_amount,
    total_inc_vat,
    notes
  ) VALUES (
    v_template.user_id,
    v_template.client_id,
    p_template_id,
    p_run_date,
    p_invoice_number,
    CASE WHEN v_template.auto_send THEN 'sent' ELSE 'draft' END,
    p_today,
    p_due_date,
    v_template.vat_rate,
    COALESCE(v_template.vat_scheme, 'standard'),
    v_subtotal,
    v_vat_amount,
    v_total,
    v_template.notes
  )
  RETURNING id INTO v_invoice_id;

  -- Copy lines to invoice_lines
  FOR v_line IN 
    SELECT * FROM recurring_invoice_lines 
    WHERE recurring_invoice_id = p_template_id 
    ORDER BY sort_order
  LOOP
    v_line_amount := ROUND((v_line.quantity * v_line.rate)::NUMERIC, 2);
    
    INSERT INTO invoice_lines (
      invoice_id,
      description,
      quantity,
      unit,
      rate,
      amount,
      sort_order
    ) VALUES (
      v_invoice_id,
      v_line.description,
      v_line.quantity,
      v_line.unit,
      v_line.rate,
      v_line_amount,
      v_index
    );
    
    v_index := v_index + 1;
  END LOOP;

  -- Update the template with new next_run_date
  UPDATE recurring_invoices
  SET next_run_date = p_next_run_date,
      last_generated_at = NOW()
  WHERE id = p_template_id;

  RETURN v_invoice_id;
END;
$$;
