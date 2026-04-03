-- Transactional operations for invoice and quote creation/update.
-- These functions ensure data integrity by wrapping multi-table writes
-- in a single atomic transaction (no partial state on failure).

-- ─── Create Invoice with Lines (atomic) ───
CREATE OR REPLACE FUNCTION create_invoice_with_lines(
  p_user_id UUID,
  p_client_id UUID,
  p_invoice_number TEXT,
  p_status TEXT,
  p_issue_date DATE,
  p_due_date DATE,
  p_vat_rate INTEGER,
  p_vat_scheme TEXT,
  p_notes TEXT,
  p_subtotal_ex_vat NUMERIC,
  p_vat_amount NUMERIC,
  p_total_inc_vat NUMERIC,
  p_is_credit_note BOOLEAN DEFAULT FALSE,
  p_original_invoice_id UUID DEFAULT NULL,
  p_lines JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_invoice_id UUID;
  v_line JSONB;
  v_index INTEGER := 0;
BEGIN
  -- Insert the invoice header
  INSERT INTO invoices (
    user_id, client_id, invoice_number, status, issue_date, due_date,
    vat_rate, vat_scheme, notes, subtotal_ex_vat, vat_amount, total_inc_vat,
    is_credit_note, original_invoice_id
  ) VALUES (
    p_user_id, p_client_id, p_invoice_number, p_status, p_issue_date, p_due_date,
    p_vat_rate, COALESCE(p_vat_scheme, 'standard'), p_notes,
    p_subtotal_ex_vat, p_vat_amount, p_total_inc_vat,
    p_is_credit_note, p_original_invoice_id
  )
  RETURNING id INTO v_invoice_id;

  -- Insert all line items
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

  RETURN v_invoice_id;
END;
$$;

-- ─── Update Invoice with Lines (atomic) ───
CREATE OR REPLACE FUNCTION update_invoice_with_lines(
  p_user_id UUID,
  p_invoice_id UUID,
  p_client_id UUID,
  p_invoice_number TEXT,
  p_status TEXT,
  p_issue_date DATE,
  p_due_date DATE,
  p_vat_rate INTEGER,
  p_vat_scheme TEXT,
  p_notes TEXT,
  p_subtotal_ex_vat NUMERIC,
  p_vat_amount NUMERIC,
  p_total_inc_vat NUMERIC,
  p_lines JSONB DEFAULT '[]'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_line JSONB;
  v_index INTEGER := 0;
BEGIN
  -- Update the invoice header
  UPDATE invoices SET
    client_id = p_client_id,
    invoice_number = p_invoice_number,
    status = p_status,
    issue_date = p_issue_date,
    due_date = p_due_date,
    vat_rate = p_vat_rate,
    vat_scheme = COALESCE(p_vat_scheme, 'standard'),
    notes = p_notes,
    subtotal_ex_vat = p_subtotal_ex_vat,
    vat_amount = p_vat_amount,
    total_inc_vat = p_total_inc_vat
  WHERE id = p_invoice_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factuur niet gevonden of geen toegang.';
  END IF;

  -- Delete existing lines and re-insert
  DELETE FROM invoice_lines WHERE invoice_id = p_invoice_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO invoice_lines (
      invoice_id, description, quantity, unit, rate, amount, sort_order
    ) VALUES (
      p_invoice_id,
      v_line->>'description',
      (v_line->>'quantity')::NUMERIC,
      v_line->>'unit',
      (v_line->>'rate')::NUMERIC,
      (v_line->>'amount')::NUMERIC,
      v_index
    );
    v_index := v_index + 1;
  END LOOP;
END;
$$;

-- ─── Create Quote with Lines (atomic) ───
CREATE OR REPLACE FUNCTION create_quote_with_lines(
  p_user_id UUID,
  p_client_id UUID,
  p_quote_number TEXT,
  p_status TEXT,
  p_issue_date DATE,
  p_valid_until DATE,
  p_vat_rate INTEGER,
  p_notes TEXT,
  p_subtotal_ex_vat NUMERIC,
  p_vat_amount NUMERIC,
  p_total_inc_vat NUMERIC,
  p_lines JSONB DEFAULT '[]'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_quote_id UUID;
  v_line JSONB;
  v_index INTEGER := 0;
BEGIN
  INSERT INTO quotes (
    user_id, client_id, quote_number, status, issue_date, valid_until,
    vat_rate, notes, subtotal_ex_vat, vat_amount, total_inc_vat
  ) VALUES (
    p_user_id, p_client_id, p_quote_number, p_status, p_issue_date, p_valid_until,
    p_vat_rate, p_notes, p_subtotal_ex_vat, p_vat_amount, p_total_inc_vat
  )
  RETURNING id INTO v_quote_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO quote_lines (
      quote_id, description, quantity, unit, rate, amount, sort_order
    ) VALUES (
      v_quote_id,
      v_line->>'description',
      (v_line->>'quantity')::NUMERIC,
      v_line->>'unit',
      (v_line->>'rate')::NUMERIC,
      (v_line->>'amount')::NUMERIC,
      v_index
    );
    v_index := v_index + 1;
  END LOOP;

  RETURN v_quote_id;
END;
$$;

-- ─── Update Quote with Lines (atomic) ───
CREATE OR REPLACE FUNCTION update_quote_with_lines(
  p_user_id UUID,
  p_quote_id UUID,
  p_client_id UUID,
  p_quote_number TEXT,
  p_status TEXT,
  p_issue_date DATE,
  p_valid_until DATE,
  p_vat_rate INTEGER,
  p_notes TEXT,
  p_subtotal_ex_vat NUMERIC,
  p_vat_amount NUMERIC,
  p_total_inc_vat NUMERIC,
  p_lines JSONB DEFAULT '[]'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_line JSONB;
  v_index INTEGER := 0;
BEGIN
  UPDATE quotes SET
    client_id = p_client_id,
    quote_number = p_quote_number,
    status = p_status,
    issue_date = p_issue_date,
    valid_until = p_valid_until,
    vat_rate = p_vat_rate,
    notes = p_notes,
    subtotal_ex_vat = p_subtotal_ex_vat,
    vat_amount = p_vat_amount,
    total_inc_vat = p_total_inc_vat
  WHERE id = p_quote_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offerte niet gevonden of geen toegang.';
  END IF;

  DELETE FROM quote_lines WHERE quote_id = p_quote_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO quote_lines (
      quote_id, description, quantity, unit, rate, amount, sort_order
    ) VALUES (
      p_quote_id,
      v_line->>'description',
      (v_line->>'quantity')::NUMERIC,
      v_line->>'unit',
      (v_line->>'rate')::NUMERIC,
      (v_line->>'amount')::NUMERIC,
      v_index
    );
    v_index := v_index + 1;
  END LOOP;
END;
$$;
