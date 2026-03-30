-- Dashboard stats RPC: returns all 12 dashboard data points in a single server-side call
-- SECURITY DEFINER runs as the function owner (bypasses RLS), so we filter by p_user_id explicitly.

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  v_now timestamptz := now();
  v_today date := CURRENT_DATE;
  v_month_start date := date_trunc('month', v_now)::date;
  v_month_end date := (date_trunc('month', v_now) + interval '1 month' - interval '1 day')::date;
  v_year_start date := date_trunc('year', v_now)::date;
  v_six_months_ago date := (date_trunc('month', v_now) - interval '5 months')::date;
  v_upcoming_cutoff date := v_today + interval '7 days';
  v_current_q int := EXTRACT(QUARTER FROM v_now)::int;
  v_q_start date;
  v_q_end date;

  -- Stats
  v_revenue_this_month numeric := 0;
  v_open_invoice_count int := 0;
  v_open_invoice_amount numeric := 0;
  v_vat_to_pay numeric := 0;
  v_receipts_this_month int := 0;

  -- VAT quarter
  v_output_vat numeric := 0;
  v_input_vat numeric := 0;

  -- Bank balance
  v_bank_balance numeric := 0;

  -- Year revenue
  v_year_revenue_ex_vat numeric := 0;
  v_year_revenue_records jsonb := '[]'::jsonb;
BEGIN
  -- Quarter date range
  v_q_start := make_date(EXTRACT(YEAR FROM v_now)::int, ((v_current_q - 1) * 3) + 1, 1);
  v_q_end := (v_q_start + interval '3 months' - interval '1 day')::date;

  -- 1. Revenue this month (paid invoices)
  SELECT COALESCE(SUM(total_inc_vat), 0) INTO v_revenue_this_month
  FROM invoices
  WHERE user_id = p_user_id AND status = 'paid'
    AND issue_date >= v_month_start AND issue_date <= v_month_end;

  -- 2. Open invoices (sent + overdue)
  SELECT COUNT(*), COALESCE(SUM(total_inc_vat), 0)
  INTO v_open_invoice_count, v_open_invoice_amount
  FROM invoices
  WHERE user_id = p_user_id AND status IN ('sent', 'overdue');

  -- 3. VAT to pay this month
  SELECT COALESCE(SUM(vat_amount), 0) INTO v_vat_to_pay
  FROM invoices
  WHERE user_id = p_user_id AND status IN ('sent', 'paid')
    AND issue_date >= v_month_start AND issue_date <= v_month_end;

  -- 4. Receipts this month
  SELECT COUNT(*) INTO v_receipts_this_month
  FROM receipts
  WHERE user_id = p_user_id
    AND receipt_date >= v_month_start AND receipt_date <= v_month_end;

  -- 5. VAT quarter invoices (output vat)
  SELECT COALESCE(SUM(vat_amount), 0) INTO v_output_vat
  FROM invoices
  WHERE user_id = p_user_id AND status IN ('sent', 'paid')
    AND issue_date >= v_q_start AND issue_date <= v_q_end;

  -- 6. VAT quarter receipts (input vat)
  SELECT COALESCE(SUM(vat_amount), 0) INTO v_input_vat
  FROM receipts
  WHERE user_id = p_user_id
    AND receipt_date >= v_q_start AND receipt_date <= v_q_end;

  -- 7. Bank balance
  SELECT COALESCE(SUM(amount), 0) INTO v_bank_balance
  FROM bank_transactions
  WHERE user_id = p_user_id;

  -- 8. Year revenue (for safe-to-spend)
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('total_inc_vat', total_inc_vat, 'vat_amount', vat_amount)),
    '[]'::jsonb
  ) INTO v_year_revenue_records
  FROM invoices
  WHERE user_id = p_user_id AND status = 'paid'
    AND issue_date >= v_year_start;

  -- Build the result
  result := jsonb_build_object(
    'revenueThisMonth', v_revenue_this_month,
    'openInvoiceCount', v_open_invoice_count,
    'openInvoiceAmount', v_open_invoice_amount,
    'vatToPay', v_vat_to_pay,
    'receiptsThisMonth', v_receipts_this_month,
    'outputVat', v_output_vat,
    'inputVat', v_input_vat,
    'bankBalance', v_bank_balance,
    'yearRevenueRecords', v_year_revenue_records,

    -- 9. Recent invoices (5)
    'recentInvoices', COALESCE((
      SELECT jsonb_agg(to_jsonb(r))
      FROM (
        SELECT i.id, i.invoice_number, i.status, i.issue_date, i.total_inc_vat,
               COALESCE(c.name, '—') AS client_name
        FROM invoices i
        LEFT JOIN clients c ON c.id = i.client_id
        WHERE i.user_id = p_user_id
        ORDER BY i.created_at DESC
        LIMIT 5
      ) r
    ), '[]'::jsonb),

    -- 10. Upcoming invoices (10)
    'upcomingInvoices', COALESCE((
      SELECT jsonb_agg(to_jsonb(r))
      FROM (
        SELECT i.id, i.invoice_number, i.status, i.due_date, i.total_inc_vat,
               COALESCE(c.name, '—') AS client_name,
               c.email AS client_email,
               GREATEST(0, (v_today - i.due_date::date)) AS days_overdue
        FROM invoices i
        LEFT JOIN clients c ON c.id = i.client_id
        WHERE i.user_id = p_user_id
          AND i.status IN ('sent', 'overdue')
          AND i.due_date IS NOT NULL
          AND i.due_date <= v_upcoming_cutoff
        ORDER BY i.due_date ASC
        LIMIT 10
      ) r
    ), '[]'::jsonb),

    -- 11. Cashflow: monthly revenue (6 months)
    'cashflowRevenue', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('month', m.month, 'amount', COALESCE(r.total, 0)) ORDER BY m.month)
      FROM (
        SELECT to_char(generate_series(v_six_months_ago, v_month_start, '1 month'), 'YYYY-MM') AS month
      ) m
      LEFT JOIN (
        SELECT to_char(issue_date, 'YYYY-MM') AS month, SUM(total_inc_vat) AS total
        FROM invoices
        WHERE user_id = p_user_id AND status = 'paid' AND issue_date >= v_six_months_ago
        GROUP BY to_char(issue_date, 'YYYY-MM')
      ) r ON r.month = m.month
    ), '[]'::jsonb),

    -- 12. Cashflow: monthly expenses (6 months)
    'cashflowExpenses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('month', m.month, 'amount', COALESCE(r.total, 0)) ORDER BY m.month)
      FROM (
        SELECT to_char(generate_series(v_six_months_ago, v_month_start, '1 month'), 'YYYY-MM') AS month
      ) m
      LEFT JOIN (
        SELECT to_char(receipt_date, 'YYYY-MM') AS month, SUM(total_amount) AS total
        FROM receipts
        WHERE user_id = p_user_id AND receipt_date >= v_six_months_ago
        GROUP BY to_char(receipt_date, 'YYYY-MM')
      ) r ON r.month = m.month
    ), '[]'::jsonb),

    -- Meta
    'currentQuarter', v_current_q,
    'quarterStart', v_q_start,
    'quarterEnd', v_q_end
  );

  RETURN result;
END;
$$;
