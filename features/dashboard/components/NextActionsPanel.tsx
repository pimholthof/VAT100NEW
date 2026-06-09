"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { m as motion } from "framer-motion";
import { useLocale } from "@/lib/i18n/context";
import { formatCurrency } from "@/lib/format";
import { deriveNextActions, type NextAction, type NextActionTone } from "@/lib/logic/next-actions";
import { getControleBevindingen } from "@/features/tax/controle";
import type { DashboardData } from "@/features/dashboard/actions";

/** Bon-bevindingen uit de controle-laag die de gebruiker zelf moet nakijken. */
const RECEIPT_FINDING_KINDS = new Set(["duplicate_receipt", "receipt_incomplete"]);

const TONE_COLOR: Record<NextActionTone, string> = {
  urgent: "var(--color-overdue)",
  attention: "var(--color-warning)",
  calm: "var(--foreground)",
  done: "var(--color-success)",
};

/**
 * Predictive Calm op het canvas: de éérstvolgende dingen die ertoe doen,
 * elk met één heldere actie. Rust boven volledigheid.
 */
export function NextActionsPanel({ data }: { data?: DashboardData }) {
  const { t } = useLocale();
  const a = t.dashboard;

  // Controle-laag, niet-blokkerend naast de dashboarddata geladen: zo verschijnt
  // een mogelijke dubbele/onvolledige bon rustig in "Nu doen".
  const { data: controleResult } = useQuery({
    queryKey: ["controle"],
    queryFn: () => getControleBevindingen(),
    staleTime: 60_000,
  });

  const receiptIssues = useMemo(() => {
    const findings = controleResult?.data?.findings ?? [];
    return findings.filter((f) => RECEIPT_FINDING_KINDS.has(f.kind)).length;
  }, [controleResult]);

  const actions = useMemo(() => {
    const upcoming = data?.upcomingInvoices ?? [];
    const overdue = upcoming.filter((i) => i.days_overdue > 0);
    const overdueCount = overdue.length;
    const overdueAmount = overdue.reduce((sum, i) => sum + i.total_inc_vat, 0);

    const openCount = data?.stats?.openInvoiceCount ?? 0;
    const openAmount = data?.stats?.openInvoiceAmount ?? 0;

    const hasAnyInvoice =
      openCount > 0 ||
      (data?.stats?.revenueThisMonth ?? 0) > 0 ||
      upcoming.length > 0 ||
      (data?.openInvoices?.length ?? 0) > 0;

    return deriveNextActions({
      overdueCount,
      overdueAmount,
      collectCount: Math.max(0, openCount - overdueCount),
      collectAmount: Math.max(0, openAmount - overdueAmount),
      hasAnyInvoice,
      vat: data?.vatDeadline
        ? {
            quarter: data.vatDeadline.quarter,
            daysRemaining: data.vatDeadline.daysRemaining,
            amount: data.vatDeadline.estimatedAmount,
          }
        : null,
      receiptIssues,
    });
  }, [data, receiptIssues]);

  function content(action: NextAction): { title: string; detail: string; cta: string | null } {
    switch (action.kind) {
      case "overdue":
        return { title: a.actionOverdueTitle, detail: formatCurrency(action.amount ?? 0), cta: a.actionOverdueCta };
      case "vat":
        return {
          title: a.actionVatTitle.replace("{quarter}", action.quarter ?? ""),
          detail: a.actionVatDetail
            .replace("{days}", String(action.days ?? 0))
            .replace("{amount}", formatCurrency(action.amount ?? 0)),
          cta: a.actionVatCta,
        };
      case "reviewReceipts":
        return { title: a.actionReviewTitle, detail: a.actionReviewDetail, cta: a.actionReviewCta };
      case "collect":
        return { title: a.actionCollectTitle, detail: formatCurrency(action.amount ?? 0), cta: a.actionCollectCta };
      case "firstInvoice":
        return { title: a.actionFirstTitle, detail: a.actionFirstDetail, cta: a.actionFirstCta };
      case "allClear":
        return { title: a.actionAllClearTitle, detail: a.actionAllClearDetail, cta: null };
    }
  }

  return (
    <section className="glass" style={{ borderRadius: "var(--radius-lg)", padding: "22px 28px" }}>
      <span className="label" style={{ display: "block", marginBottom: 4 }}>{a.actionsHeading}</span>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {actions.map((action, i) => {
          const { title, detail, cta } = content(action);
          const color = TONE_COLOR[action.tone];
          const showCount = (action.kind === "overdue" || action.kind === "collect" || action.kind === "reviewReceipts") && (action.count ?? 0) > 1;
          return (
            <motion.div
              key={action.kind}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: i * 0.05 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                padding: "16px 0",
                borderTop: i === 0 ? "none" : "0.5px solid rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                <span aria-hidden style={{ width: 3, alignSelf: "stretch", minHeight: 34, borderRadius: 2, background: color, flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "var(--text-body-md)", fontWeight: 600, letterSpacing: "-0.01em" }}>{title}</span>
                    {showCount && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 7px",
                          borderRadius: 999,
                          background: color,
                          color: "#fff",
                          lineHeight: 1.5,
                        }}
                      >
                        {action.count}
                      </span>
                    )}
                  </span>
                  <span className="mono-amount" style={{ display: "block", marginTop: 3, fontSize: "var(--text-body-sm)", opacity: 0.6 }}>
                    {detail}
                  </span>
                </div>
              </div>
              {cta && action.href && (
                <Link
                  href={action.href}
                  style={{
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                    color: action.tone === "calm" ? "var(--foreground)" : color,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cta} →
                </Link>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
