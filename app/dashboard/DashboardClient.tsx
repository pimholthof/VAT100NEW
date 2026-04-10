"use client";

import { useQuery } from "@tanstack/react-query";
import { m as motion, type Variants } from "framer-motion";
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
import { UpcomingInvoiceTable } from "@/features/dashboard/components/UpcomingInvoiceTable";
import { CashflowForecast } from "@/features/dashboard/components/CashflowForecast";
import { HealthScore } from "@/features/dashboard/components/HealthScore";
import { OnboardingChecklist } from "@/features/onboarding/components/OnboardingChecklist";
import { getOnboardingProgress, type OnboardingProgress } from "@/features/onboarding/actions";
import { useLocale } from "@/lib/i18n/context";
import { useState } from "react";
import TaxAgentChat from "@/components/ai/TaxAgentChat";
import { Button } from "@/components/ui/Button";
import { Bot } from "lucide-react";



export default function DashboardClient({
  initialResult,
  initialOnboarding,
}: {
  initialResult?: ActionResult<DashboardData>;
  initialOnboarding?: OnboardingProgress | null;
}) {
  const { locale, t } = useLocale();
  const [showAIChat, setShowAIChat] = useState(false);
  const { data: dashboardResult, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    initialData: initialResult,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  const { data: onboardingResult } = useQuery({
    queryKey: ["onboarding-progress"],
    queryFn: async () => {
      const res = await getOnboardingProgress();
      return res.data ?? null;
    },
    initialData: initialOnboarding,
    staleTime: 30_000,
  });

  const data = dashboardResult?.data;
  const stats = data?.stats;

  const openInvoices = data?.openInvoices;
  const upcomingInvoices = data?.upcomingInvoices;
  const safeToSpend = data?.safeToSpend;
  const vatDeadline = data?.vatDeadline;

  const urgentInvoiceCount = upcomingInvoices?.filter((invoice) => invoice.days_overdue > 0).length ?? 0;
  const upcomingInvoiceAmount = upcomingInvoices?.reduce((sum, invoice) => sum + invoice.total_inc_vat, 0) ?? 0;
  const nextInvoiceDue = upcomingInvoices?.find((invoice) => invoice.due_date && invoice.days_overdue <= 0);

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  const dateLocale = locale === "en" ? "en-GB" : "nl-NL";
  const nextInvoiceDueLabel = nextInvoiceDue?.due_date
    ? new Intl.DateTimeFormat(dateLocale, { day: "numeric", month: "short" }).format(new Date(nextInvoiceDue.due_date))
    : null;

  const heroMessage = urgentInvoiceCount > 0
    ? t.dashboard.invoicesOverdue
        .replace("{count}", String(urgentInvoiceCount))
        .replace("{plural}", urgentInvoiceCount === 1 ? t.dashboard.invoiceOverdueSingular : t.dashboard.invoiceOverduePlural)
    : nextInvoiceDue && nextInvoiceDueLabel
      ? t.dashboard.nextDeadline
          .replace("{client}", nextInvoiceDue.client_name)
          .replace("{date}", nextInvoiceDueLabel)
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
      {/* ── ONBOARDING CHECKLIST (new users) ── */}
      {!isLoading && onboardingResult && !onboardingResult.onboardingCompleted && (
        <OnboardingChecklist
          hasProfile={onboardingResult.hasProfile}
          hasClient={onboardingResult.hasClient}
          hasInvoice={onboardingResult.hasInvoice}
          hasReceipt={onboardingResult.hasReceipt}
          hasBankConnection={onboardingResult.hasBankConnection}
        />
      )}

      {/* ── HERO ── */}
      {!isLoading && (
        <div className="dashboard-home-hero">
          <motion.div variants={itemVariants} className="dashboard-home-hero-copy">
            <p className="label" style={{ margin: 0 }}>{t.dashboard.today}</p>
            <h1 className="dashboard-home-title">{t.dashboard.heroTitle}</h1>
            <p className="dashboard-home-intro">{heroMessage}</p>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="dashboard-home-hero-stats">
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
                  {vatDeadline ? `${vatDeadline.quarter} · ${new Date(vatDeadline.deadline).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}` : t.dashboard.noDeadline}
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
              sub={vatDeadline ? new Date(vatDeadline.deadline).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" }) : t.dashboard.thisQuarter}
            />
          </motion.div>
        </div>
      )}


      {/* ── FINANCIAL HEALTH ── */}
      {data?.financialHealth && !isLoading && (
        <motion.div variants={itemVariants}>
          <HealthScore health={data.financialHealth} />
        </motion.div>
      )}

      {/* ── CASHFLOW FORECAST ── */}
      {data?.cashflowForecast && !isLoading && (
        <motion.div variants={itemVariants}>
          <CashflowForecast
            weeks={data.cashflowForecast}
            hasBank={(safeToSpend?.currentBalance ?? 0) !== 0}
          />
        </motion.div>
      )}

      {/* ── AI TAX ASSISTANT ── */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="brutalist-section-title">
            <span>AI Fiscale Assistent</span>
            <span className="brutalist-rule" />
          </h2>
          <Button
            onClick={() => setShowAIChat(!showAIChat)}
            variant={showAIChat ? "secondary" : "primary"}
            className="flex items-center gap-2"
          >
            <Bot className="w-4 h-4" />
            {showAIChat ? "Verberg" : "Toon"} AI Assistent
          </Button>
        </div>
        
        {showAIChat && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <TaxAgentChat />
          </div>
        )}
      </motion.div>

      {/* ── OPEN INVOICES ── */}
      <motion.div variants={itemVariants}>
        <h2 className="brutalist-section-title">
          <span>{t.dashboard.openInvoicesTitle}</span>
          <span className="brutalist-rule" />
        </h2>
        {isLoading ? (
          <SkeletonTable />
        ) : openInvoices && openInvoices.length > 0 ? (
          <UpcomingInvoiceTable invoices={openInvoices} />
        ) : (
          <p className="empty-state">{t.dashboard.noOpenInvoices}</p>
        )}
      </motion.div>


    </motion.div>
  );
}
