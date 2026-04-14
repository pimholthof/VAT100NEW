"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { m as motion, type Variants, Reorder } from "framer-motion";
import {
  getDashboardData,
  saveDashboardLayout,
  type DashboardData,
} from "@/features/dashboard/actions";
import type { ActionResult } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

import { StatCard, SkeletonTable } from "@/components/ui";
import { UpcomingInvoiceTable } from "@/features/dashboard/components/UpcomingInvoiceTable";
import { CashflowForecast } from "@/features/dashboard/components/CashflowForecast";
import { HealthScore } from "@/features/dashboard/components/HealthScore";
import { QuickReceiptUpload } from "@/features/dashboard/components/QuickReceiptUpload";
import { QuickLogWidget } from "@/features/dashboard/components/QuickLogWidget";
import { ActionFeed } from "@/features/dashboard/components/ActionFeed";
import { DashboardWidget } from "@/features/dashboard/components/DashboardWidget";
import {
  OnboardingChecklist,
} from "@/features/onboarding/components/OnboardingChecklist";
import {
  getOnboardingProgress,
  type OnboardingProgress,
} from "@/features/onboarding/actions";
import { useLocale } from "@/lib/i18n/context";
import { useState } from "react";
import TaxAgentChat from "@/components/ai/TaxAgentChat";
import { Button } from "@/components/ui/Button";
import { Bot, Settings2, RotateCcw } from "lucide-react";
import { useDashboardStore } from "@/lib/store/dashboard";
import {
  WIDGET_IDS,
  WIDGET_META,
  type WidgetId,
} from "@/features/dashboard/widget-registry";

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

  // ── Widget layout store ──
  const {
    order,
    hidden,
    isEditMode,
    isDirty,
    initialized,
    initialize,
    reorder,
    enterEditMode,
    exitEditMode,
    resetToDefault,
    toLayout,
  } = useDashboardStore();

  useEffect(() => {
    if (data?.dashboardLayout !== undefined) {
      initialize(data.dashboardLayout);
    }
  }, [data?.dashboardLayout, initialize]);

  // Auto-save on exit edit mode
  useEffect(() => {
    if (!isEditMode && isDirty && initialized) {
      saveDashboardLayout(toLayout());
    }
  }, [isEditMode, isDirty, initialized, toLayout]);

  const urgentInvoiceCount =
    upcomingInvoices?.filter((invoice) => invoice.days_overdue > 0).length ?? 0;
  const upcomingInvoiceAmount =
    upcomingInvoices?.reduce((sum, invoice) => sum + invoice.total_inc_vat, 0) ??
    0;
  const nextInvoiceDue = upcomingInvoices?.find(
    (invoice) => invoice.due_date && invoice.days_overdue <= 0
  );

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  const dateLocale = locale === "en" ? "en-GB" : "nl-NL";
  const nextInvoiceDueLabel = nextInvoiceDue?.due_date
    ? new Intl.DateTimeFormat(dateLocale, {
        day: "numeric",
        month: "short",
      }).format(new Date(nextInvoiceDue.due_date))
    : null;

  const heroMessage =
    urgentInvoiceCount > 0
      ? t.dashboard.invoicesOverdue
          .replace("{count}", String(urgentInvoiceCount))
          .replace(
            "{plural}",
            urgentInvoiceCount === 1
              ? t.dashboard.invoiceOverdueSingular
              : t.dashboard.invoiceOverduePlural
          )
      : nextInvoiceDue && nextInvoiceDueLabel
        ? t.dashboard.nextDeadline
            .replace("{client}", nextInvoiceDue.client_name)
            .replace("{date}", nextInvoiceDueLabel)
        : t.dashboard.noUrgentInvoices;

  // ── Widget availability (progressive disclosure) ──
  const widgetAvailability: Record<WidgetId, boolean> = {
    [WIDGET_IDS.KPI_GRID]: !!stats && !isLoading,
    [WIDGET_IDS.HEALTH_SCORE]:
      !!data?.financialHealth &&
      !isLoading &&
      ((stats?.openInvoiceCount ?? 0) > 0 || (stats?.revenueThisMonth ?? 0) > 0),
    [WIDGET_IDS.CASHFLOW_FORECAST]:
      !!data?.cashflowForecast &&
      !isLoading &&
      ((safeToSpend?.currentBalance ?? 0) !== 0 ||
        (stats?.receiptsThisMonth ?? 0) > 0),
    [WIDGET_IDS.AI_ASSISTANT]: !isLoading,
    [WIDGET_IDS.OPEN_INVOICES]: !isLoading,
    [WIDGET_IDS.QUICK_RECEIPT]: !isLoading,
    [WIDGET_IDS.QUICK_LOG]: !isLoading,
    [WIDGET_IDS.ACTION_FEED]: !isLoading,
  };

  // ── Widget content renderers ──
  const widgetContent: Record<WidgetId, React.ReactNode> = {
    [WIDGET_IDS.KPI_GRID]: stats ? (
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
            sub={
              vatDeadline
                ? new Date(vatDeadline.deadline).toLocaleDateString(dateLocale, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : t.dashboard.thisQuarter
            }
          />
        </motion.div>
      </div>
    ) : null,

    [WIDGET_IDS.HEALTH_SCORE]: data?.financialHealth ? (
      <HealthScore health={data.financialHealth} />
    ) : null,

    [WIDGET_IDS.CASHFLOW_FORECAST]: data?.cashflowForecast ? (
      <CashflowForecast
        weeks={data.cashflowForecast}
        hasBank={(safeToSpend?.currentBalance ?? 0) !== 0}
      />
    ) : null,

    [WIDGET_IDS.AI_ASSISTANT]: (
      <>
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
      </>
    ),

    [WIDGET_IDS.OPEN_INVOICES]: (
      <>
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
      </>
    ),

    [WIDGET_IDS.QUICK_RECEIPT]: (
      <>
        <h2 className="brutalist-section-title">
          <span>{(t.dashboard.widgets as Record<string, string>).quickReceipt}</span>
          <span className="brutalist-rule" />
        </h2>
        <QuickReceiptUpload />
      </>
    ),

    [WIDGET_IDS.QUICK_LOG]: (
      <>
        <h2 className="brutalist-section-title">
          <span>{(t.dashboard.widgets as Record<string, string>).quickLog}</span>
          <span className="brutalist-rule" />
        </h2>
        <QuickLogWidget />
      </>
    ),

    [WIDGET_IDS.ACTION_FEED]: <ActionFeed />,
  };

  // ── Widget label resolver ──
  const getWidgetLabel = (id: WidgetId): string => {
    const meta = WIDGET_META[id];
    const widgets = t.dashboard.widgets as Record<string, string>;
    return widgets[meta.labelKey] ?? meta.labelKey;
  };

  if (dashboardResult?.error) {
    return (
      <div className="brutalist-panel brutalist-panel-padded">
        <p className="label" style={{ margin: 0 }}>
          Dashboard
        </p>
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

  // Filter visible widgets for normal mode
  const visibleWidgets = order.filter(
    (id) => !hidden.includes(id) && widgetAvailability[id]
  );

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
      {!isLoading &&
        onboardingResult &&
        !onboardingResult.onboardingCompleted &&
        !onboardingResult.onboardingDismissed && (
          <OnboardingChecklist
            hasProfile={onboardingResult.hasProfile}
            hasFiscalProfile={onboardingResult.hasFiscalProfile}
            hasClient={onboardingResult.hasClient}
            hasInvoice={onboardingResult.hasInvoice}
            hasReceipt={onboardingResult.hasReceipt}
            hasBankConnection={onboardingResult.hasBankConnection}
            onboardingDismissed={onboardingResult.onboardingDismissed}
          />
        )}

      {/* ── HERO (fixed, not draggable) ── */}
      {!isLoading && (
        <div className="dashboard-home-hero">
          <motion.div
            variants={itemVariants}
            className="dashboard-home-hero-copy"
          >
            <p className="label" style={{ margin: 0 }}>
              {t.dashboard.today}
            </p>
            <h1 className="dashboard-home-title">{t.dashboard.heroTitle}</h1>
            <p className="dashboard-home-intro">{heroMessage}</p>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="dashboard-home-hero-stats">
              <div className="dashboard-home-meta-item">
                <span className="label">{t.dashboard.freeToSpend}</span>
                <span className="dashboard-home-meta-value">
                  {safeToSpend
                    ? formatCurrency(safeToSpend.safeToSpend)
                    : "\u2014"}
                </span>
                <p className="dashboard-home-meta-sub">
                  {t.dashboard.balance}{" "}
                  {safeToSpend
                    ? formatCurrency(safeToSpend.currentBalance)
                    : t.dashboard.balanceNotAvailable}
                </p>
              </div>

              <div className="dashboard-home-meta-item">
                <span className="label">{t.dashboard.vatDeadline}</span>
                <span className="dashboard-home-meta-value">
                  {vatDeadline
                    ? `${vatDeadline.daysRemaining} ${t.dashboard.days}`
                    : "\u2014"}
                </span>
                <p className="dashboard-home-meta-sub">
                  {vatDeadline
                    ? `${vatDeadline.quarter} \u00B7 ${new Date(vatDeadline.deadline).toLocaleDateString(dateLocale, { day: "numeric", month: "long", year: "numeric" })}`
                    : t.dashboard.noDeadline}
                </p>
              </div>

              <div className="dashboard-home-meta-item">
                <span className="label">{t.dashboard.outstandingAmount}</span>
                <span className="dashboard-home-meta-value">
                  {formatCurrency(upcomingInvoiceAmount)}
                </span>
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

      {/* ── EDIT MODE TOGGLE ── */}
      {!isLoading && (
        <motion.div
          variants={itemVariants}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            marginBottom: isEditMode ? 8 : 0,
          }}
        >
          {isEditMode && (
            <button
              onClick={resetToDefault}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 500,
                border: "0.5px solid rgba(0, 0, 0, 0.08)",
                borderRadius: "var(--radius)",
                background: "transparent",
                cursor: "pointer",
                opacity: 0.45,
                transition: "opacity var(--duration-quick)",
              }}
            >
              <RotateCcw size={13} />
              {t.dashboard.widgets.resetToDefault}
            </button>
          )}
          <button
            onClick={() => (isEditMode ? exitEditMode() : enterEditMode())}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              border: isEditMode
                ? "0.5px solid var(--foreground)"
                : "0.5px solid rgba(0, 0, 0, 0.08)",
              borderRadius: "var(--radius)",
              background: isEditMode ? "var(--foreground)" : "transparent",
              color: isEditMode ? "var(--background)" : "var(--foreground)",
              cursor: "pointer",
              transition:
                "background var(--duration-quick), color var(--duration-quick), border-color var(--duration-quick)",
            }}
          >
            <Settings2 size={13} />
            {isEditMode
              ? t.dashboard.widgets.done
              : t.dashboard.widgets.customize}
          </button>
        </motion.div>
      )}

      {/* ── CUSTOMIZABLE WIDGETS ── */}
      {isEditMode ? (
        <Reorder.Group
          axis="y"
          values={order}
          onReorder={(newOrder) => reorder(newOrder as WidgetId[])}
          layout
          style={{
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-md)",
          }}
        >
          {order.map((widgetId, idx) => (
            <DashboardWidget
              key={widgetId}
              widgetId={widgetId}
              label={getWidgetLabel(widgetId)}
              isFirst={idx === 0}
              isLast={idx === order.length - 1}
            >
              {widgetAvailability[widgetId] ? widgetContent[widgetId] : null}
            </DashboardWidget>
          ))}
        </Reorder.Group>
      ) : (
        visibleWidgets.map((widgetId) => (
          <motion.div key={widgetId} variants={itemVariants}>
            {widgetContent[widgetId]}
          </motion.div>
        ))
      )}
    </motion.div>
  );
}
