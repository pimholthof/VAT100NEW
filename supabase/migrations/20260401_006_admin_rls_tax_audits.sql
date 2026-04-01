-- ══════════════════════════════════════════════════════════════
-- Admin RLS: allow admins to read ALL tax audits across users
-- ══════════════════════════════════════════════════════════════

CREATE POLICY "Admins can view all tax_audits" ON public.tax_audits
  FOR SELECT
  USING (public.is_admin());
