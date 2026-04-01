"use client";

import { useQuery } from "@tanstack/react-query";
import { m as motion , type Variants } from "framer-motion";
import {
  getDashboardData,
  type DashboardData,
} from "@/features/dashboard/actions";
import type { ActionResult } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

import {
  StatCard,
  SkeletonTable,
} from "@/components/ui";
import { FiscalPulse } from "@/features/dashboard/components/FiscalPulse";
import { UpcomingInvoiceTable } from "@/features/dashboard/components/UpcomingInvoiceTable";
import { useLocale } from "@/lib/i18n/context";



export default function DashboardClient({
  initialResult,
}: {
  initialResult?: ActionResult<DashboardData>;
}) {
  const { locale, t } = useLocale();
  const { data: dashboardResult, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    initialData: initialResult,
  });

  const data = dashboardResult?.data;
  const stats = data?.stats;

  const upcomingInvoices = data?.upcomingInvoices;
  const safeToSpend = data?.safeToSpend;
  const vatDeadline = data?.vatDeadline;

  const urgentInvoiceCount = upcomingInvoices?.filter((invoice) => invoice.days_overdue > 0).length ?? 0;
  const upcomingInvoiceAmount = upcomingInvoices?.reduce((sum, invoice) => sum + invoice.total_inc_vat, 0) ?? 0;
  const nextInvoiceDue = upcomingInvoices?.find((invoice) => invoice.days_overdue <= 0);

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const dateLocale = locale === "en" ? "en-GB" : "nl-NL";
  const heroMessage = urgentInvoiceCount > 0
    ? t.dashboard.invoicesOverdue
        .replace("{count}", String(urgentInvoiceCount))
        .replace("{plural}", urgentInvoiceCount === 1 ? t.dashboard.invoiceOverdueSingular : t.dashboard.invoiceOverduePlural)
    : nextInvoiceDue
      ? t.dashboard.nextDeadline
          .replace("{client}", nextInvoiceDue.client_name)
          .replace("{date}", new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "short" }).format(new Date(nextInvoiceDue.due_date)))
      : t.dashboard.noUrgentInvoices;

  if (dashboardResult?.error) {
    return (
      <div className="brutalist-panel brutalist-panel-padded">
        <p className="label" style={{ margin: 0 }}>Dashboard</p>
        <p
          style={{
            fontSize: "var(--text-display-sm)",
            fontWeight: 600,
            lineHeight: 1.1,
            margin: "12px 0 0",
            maxWidth: "24rem",
          }}
        >
          {dashboardResult.error}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.12,
          },
        },
      }}
      className="dashboard-content-inner dashboard-home"
    >
      {/* ── HERO ── */}
      {!isLoading && (
        <div className="dashboard-home-hero">
          <motion.div variants={itemVariants} className="dashboard-home-hero-copy">
            <p className="label" style={{ margin: 0 }}>{t.dashboard.today}</p>
            <h1 className="dashboard-home-title">{t.dashboard.heroTitle}</h1>
            <p className="dashboard-home-intro">{heroMessage}</p>
          </motion.div>

          <motion.div variants={itemVariants} className="dashboard-home-hero-stats">
            <div className="dashboard-home-meta-item">
              <span className="label">{t.dashboard.freeToSpend}</span>
              <span className="dashboard-home-meta-value">
                {safeToSpend ? formatCurrency(safeToSpend.safeToSpend) : "—"}
              </span>
              <p className="dashboard-home-meta-sub">
                {t.dashboard.balance} {safeToSpend ? formatCurrency(safeToSpend.currentBalance) : t.dashboard.balanceNotAvailable}
              </p>
            </div>

            <div className="dashboard-home-meta-item">
              <span className="label">{t.dashboard.vatDeadline}</span>
              <span className="dashboard-home-meta-value">
                {vatDeadline ? `${vatDeadline.daysRemaining} ${t.dashboard.days}` : "—"}
              </span>
              <p className="dashboard-home-meta-sub">
                {vatDeadline ? `${vatDeadline.quarter} · ${vatDeadline.deadline}` : t.dashboard.noDeadline}
              </p>
            </div>

            <div className="dashboard-home-meta-item">
              <span className="label">{t.dashboard.outstandingAmount}</span>
              <span className="dashboard-home-meta-value">{formatCurrency(upcomingInvoiceAmount)}</span>
              <p className="dashboard-home-meta-sub">
                {urgentInvoiceCount > 0
                  ? `${urgentInvoiceCount} ${t.dashboard.overdue}`
                  : `${upcomingInvoices?.length ?? 0} ${t.dashboard.invoicesShortTerm}`}
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {stats && !isLoading && (
        <div className="dashboard-home-kpi-grid">
          <motion.div variants={itemVariants}>
            <StatCard
              label={t.dashboard.revenueThisMonth}
              value={formatCurrency(stats.revenueThisMonth)}
              numericValue={stats.revenueThisMonth}
              sub={t.dashboard.paidThisMonth}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label={t.dashboard.openInvoices}
              value={String(stats.openInvoiceCount)}
              numericValue={stats.openInvoiceCount}
              isCurrency={false}
              sub={formatCurrency(stats.openInvoiceAmount)}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label={t.dashboard.receiptsProcessed}
              value={String(stats.receiptsThisMonth)}
              numericValue={stats.receiptsThisMonth}
              isCurrency={false}
              sub={t.dashboard.thisMonth}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label={t.dashboard.vatReserve}
              value={formatCurrency(stats.vatToPay)}
              numericValue={stats.vatToPay}
              sub={vatDeadline ? vatDeadline.deadline : t.dashboard.thisQuarter}
            />
          </motion.div>
        </div>
      )}

      {/* ── FISCAL PULSE ── */}
      {safeToSpend && !isLoading && (
        <motion.div variants={itemVariants}>
          <FiscalPulse 
            safeToSpend={safeToSpend.safeToSpend} 
            currentBalance={safeToSpend.currentBalance} 
            isLoading={isLoading}
          />
        </motion.div>
      )}

      {/* ── OPEN INVOICES ── */}
      <motion.div variants={itemVariants}>
        <h2 className="brutalist-section-title">
          <span>{t.dashboard.openInvoicesTitle}</span>
          <span className="brutalist-rule" />
        </h2>
        {isLoading ? (
          <SkeletonTable />
        ) : upcomingInvoices && upcomingInvoices.length > 0 ? (
          <UpcomingInvoiceTable invoices={upcomingInvoices} />
        ) : (
          <p className="empty-state">{t.dashboard.noOpenInvoices}</p>
        )}
      </motion.div>


    </motion.div>
  );
}
