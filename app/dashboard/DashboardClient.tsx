"use client";

import { useQuery } from "@tanstack/react-query";
import { m as motion, type Variants } from "framer-motion";
import {
  getDashboardData,
  type DashboardData,
} from "@/features/dashboard/actions";
import type { ActionResult } from "@/lib/types";

import {
  SkeletonTable,
  EmptyState,
} from "@/components/ui";
import { UpcomingInvoiceTable } from "@/features/dashboard/components/UpcomingInvoiceTable";
import { CashflowForecast } from "@/features/dashboard/components/CashflowForecast";
import { HealthScore } from "@/features/dashboard/components/HealthScore";
import { AllocationBar } from "@/features/dashboard/components/AllocationBar";
import { NextActionsPanel } from "@/features/dashboard/components/NextActionsPanel";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { OnboardingChecklist } from "@/features/onboarding/components/OnboardingChecklist";
import { getOnboardingProgress, type OnboardingProgress } from "@/features/onboarding/actions";
import { useLocale } from "@/lib/i18n/context";
import { useCallback, useSyncExternalStore } from "react";
import MobileDashboard from "@/features/dashboard/MobileDashboard";

function useIsMobile(breakpoint = 768) {
  const subscribe = useCallback((cb: () => void) => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  }, [breakpoint]);
  const getSnapshot = useCallback(
    () => window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
    [breakpoint]
  );
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function DashboardClient({
  initialResult,
  initialOnboarding,
}: {
  initialResult?: ActionResult<DashboardData>;
  initialOnboarding?: OnboardingProgress | null;
}) {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <MobileDashboard initialResult={initialResult} />;
  }
  return (
    <DesktopDashboard
      initialResult={initialResult}
      initialOnboarding={initialOnboarding}
    />
  );
}

function DesktopDashboard({
  initialResult,
  initialOnboarding,
}: {
  initialResult?: ActionResult<DashboardData>;
  initialOnboarding?: OnboardingProgress | null;
}) {
  const { t } = useLocale();
  const { data: dashboardResult, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardData(),
    initialData: initialResult,
    staleTime: 30_000,
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
  const safeToSpend = data?.safeToSpend;

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 8 },
    show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } }
  };

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
            staggerChildren: 0.04,
          },
        },
      }}
      className="dashboard-content-inner dashboard-home"
    >
      {/* ── ONBOARDING CHECKLIST (new users) ── */}
      {!isLoading && onboardingResult && !onboardingResult.onboardingCompleted && !onboardingResult.onboardingDismissed && (
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

      {/* ── HERO: één getal — wat is van jou ── */}
      {!isLoading && (
        <motion.div
          variants={itemVariants}
          className="dashboard-home-hero-copy"
          style={{ minHeight: "auto", padding: "8px 0 8px" }}
        >
          <p className="label" style={{ margin: 0 }}>{t.dashboard.freeToSpend}</p>
          <p
            style={{
              fontSize: "clamp(3rem, 6vw, 5.5rem)",
              fontWeight: 400,
              letterSpacing: "-0.04em",
              lineHeight: 1,
              margin: "8px 0 0",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {safeToSpend ? <AnimatedNumber value={safeToSpend.safeToSpend} duration={0.7} /> : "—"}
          </p>
          <p className="dashboard-home-intro">
            {t.dashboard.freeToSpendContext}
          </p>
        </motion.div>
      )}

      {/* ── NU DOEN: Predictive Calm — de eerstvolgende dingen die ertoe doen ── */}
      {!isLoading && (
        <motion.div variants={itemVariants}>
          <NextActionsPanel data={data} />
        </motion.div>
      )}

      {/* ── DE DRIE POTTEN: het hart van het systeem ── */}
      {!isLoading && (
        <motion.div variants={itemVariants}>
          <AllocationBar data={safeToSpend} />
        </motion.div>
      )}


      {/* ── FINANCIAL HEALTH (progressive disclosure: alleen tonen bij voldoende data) ── */}
      {data?.financialHealth && !isLoading &&
        ((stats?.openInvoiceCount ?? 0) > 0 || (stats?.revenueThisMonth ?? 0) > 0) && (
        <motion.div variants={itemVariants}>
          <HealthScore health={data.financialHealth} />
        </motion.div>
      )}

      {/* ── CASHFLOW FORECAST (progressive disclosure: alleen tonen bij bankdata) ── */}
      {data?.cashflowForecast && !isLoading &&
        ((safeToSpend?.currentBalance ?? 0) !== 0 || (stats?.receiptsThisMonth ?? 0) > 0) && (
        <motion.div variants={itemVariants}>
          <CashflowForecast
            weeks={data.cashflowForecast}
            hasBank={(safeToSpend?.currentBalance ?? 0) !== 0}
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
        ) : openInvoices && openInvoices.length > 0 ? (
          <UpcomingInvoiceTable invoices={openInvoices} />
        ) : onboardingResult && !onboardingResult.hasClient ? (
          <EmptyState
            icon="○"
            title="Begin met een klant"
            description="Voeg eerst een klant toe — daarna stuur je er een factuur naartoe. Kom je van Moneybird? Importeer je klanten in een paar klikken."
            actionLabel="Voeg klant toe"
            actionHref="/dashboard/clients/new"
            secondaryLabel="Importeer uit Moneybird"
            secondaryHref="/dashboard/import"
          />
        ) : (
          <EmptyState
            icon="□"
            title={t.dashboard.noOpenInvoices}
            description="Alles geïnd of nog geen facturen verstuurd. Stuur er een om te beginnen."
            actionLabel="Nieuwe factuur"
            actionHref="/dashboard/invoices/new"
          />
        )}
      </motion.div>


    </motion.div>
  );
}
