-- ══════════════════════════════════════════════════════════════
-- Dashboard RPC: get_dashboard_stats
-- Replaces 12 database roundtrips with 1 efficient PL/pgSQL call
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
  v_now TIMESTAMP := now();
  v_month_start DATE := date_trunc('month', now())::date;
  v_month_end DATE := (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date;
  v_year_start DATE := date_trunc('year', now())::date;
  v_six_months_ago DATE := (date_trunc('month', now()) - interval '5 months')::date;
  v_seven_days DATE := (now() + interval '7 days')::date;
  v_current_q INT := EXTRACT(quarter FROM now())::int;
  v_q_start DATE;
  v_q_end DATE;
BEGIN
  -- Quarter boundaries
  v_q_start := date_trunc('quarter', now())::date;
  v_q_end := (date_trunc('quarter', now()) + interval '3 months' - interval '1 day')::date;

  SELECT json_build_object(
    -- Stats
    'revenue_this_month', COALESCE((
      SELECT SUM(total_inc_vat) FROM invoices
      WHERE user_id = p_user_id AND status = 'paid'
        AND issue_date >= v_month_start AND issue_date <= v_month_end
    ), 0),
    'open_invoice_count', COALESCE((
      SELECT COUNT(*) FROM invoices
      WHERE user_id = p_user_id AND status IN ('sent', 'overdue')
    ), 0),
    'open_invoice_amount', COALESCE((
      SELECT SUM(total_inc_vat) FROM invoices
      WHERE user_id = p_user_id AND status IN ('sent', 'overdue')
    ), 0),
    'vat_to_pay', COALESCE((
      SELECT SUM(vat_amount) FROM invoices
      WHERE user_id = p_user_id AND status IN ('sent', 'paid')
        AND issue_date >= v_month_start AND issue_date <= v_month_end
    ), 0),
    'receipts_this_month', COALESCE((
      SELECT COUNT(*) FROM receipts
      WHERE user_id = p_user_id
        AND receipt_date >= v_month_start AND receipt_date <= v_month_end
    ), 0),

    -- Recent invoices (last 5)
    'recent_invoices', COALESCE((
      SELECT json_agg(row_to_json(r)) FROM (
        SELECT i.id, i.invoice_number, i.status, i.issue_date, i.total_inc_vat,
               COALESCE(c.name, '—') AS client_name
        FROM invoices i
        LEFT JOIN clients c ON c.id = i.client_id
        WHERE i.user_id = p_user_id
        ORDER BY i.created_at DESC
        LIMIT 5
      ) r
    ), '[]'::json),

    -- Upcoming invoices (due within 7 days)
    'upcoming_invoices', COALESCE((
      SELECT json_agg(row_to_json(r)) FROM (
        SELECT i.id, i.invoice_number, i.status, i.due_date, i.total_inc_vat,
               COALESCE(c.name, '—') AS client_name,
               c.email AS client_email,
               GREATEST(0, EXTRACT(day FROM now()::date - i.due_date::date))::int AS days_overdue
        FROM invoices i
        LEFT JOIN clients c ON c.id = i.client_id
        WHERE i.user_id = p_user_id
          AND i.status IN ('sent', 'overdue')
          AND i.due_date IS NOT NULL
          AND i.due_date <= v_seven_days
        ORDER BY i.due_date ASC
        LIMIT 10
      ) r
    ), '[]'::json),

    -- Cashflow: 6-month revenue
    'cashflow_invoices', COALESCE((
      SELECT json_agg(row_to_json(r)) FROM (
        SELECT issue_date, total_inc_vat
        FROM invoices
        WHERE user_id = p_user_id AND status = 'paid'
          AND issue_date >= v_six_months_ago
      ) r
    ), '[]'::json),

    -- Cashflow: 6-month expenses
    'cashflow_receipts', COALESCE((
      SELECT json_agg(row_to_json(r)) FROM (
        SELECT receipt_date, total_amount
        FROM receipts
        WHERE user_id = p_user_id
          AND receipt_date >= v_six_months_ago
      ) r
    ), '[]'::json),

    -- VAT quarter: output (invoices)
    'vat_quarter_output', COALESCE((
      SELECT SUM(vat_amount) FROM invoices
      WHERE user_id = p_user_id AND status IN ('sent', 'paid')
        AND issue_date >= v_q_start AND issue_date <= v_q_end
    ), 0),

    -- VAT quarter: input (receipts)
    'vat_quarter_input', COALESCE((
      SELECT SUM(vat_amount) FROM receipts
      WHERE user_id = p_user_id
        AND receipt_date >= v_q_start AND receipt_date <= v_q_end
    ), 0),

    -- Bank balance (sum of all transactions)
    'bank_balance', COALESCE((
      SELECT SUM(amount) FROM bank_transactions
      WHERE user_id = p_user_id
    ), 0),

    -- Year revenue data (for safe-to-spend)
    'year_revenue', COALESCE((
      SELECT json_agg(row_to_json(r)) FROM (
        SELECT total_inc_vat, vat_amount
        FROM invoices
        WHERE user_id = p_user_id AND status = 'paid'
          AND issue_date >= v_year_start
      ) r
    ), '[]'::json),

    -- Current quarter number
    'current_quarter', v_current_q
  ) INTO result;

  RETURN result;
END;
$$;
