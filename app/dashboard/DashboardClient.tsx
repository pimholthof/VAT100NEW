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
import { FiscalPulse } from "@/features/dashboard/components/FiscalPulse";
import { UpcomingInvoiceTable } from "@/features/dashboard/components/UpcomingInvoiceTable";



export default function DashboardClient({
  initialResult,
}: {
  initialResult?: ActionResult<DashboardData>;
}) {
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

  const heroMessage = urgentInvoiceCount > 0
    ? `${urgentInvoiceCount} fact${urgentInvoiceCount === 1 ? "uur is" : "uren zijn"} te laat en vragen vandaag aandacht.`
    : nextInvoiceDue
      ? `De volgende betaaldeadline is voor ${nextInvoiceDue.client_name} op ${new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(new Date(nextInvoiceDue.due_date))}.`
      : "Je hebt op dit moment geen facturen die op korte termijn aandacht nodig hebben.";

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
          <motion.div variants={itemVariants} className="dashboard-home-hero-copy" style={{ position: "relative" }}>
            {/* Editorial moodboard background */}
            <div style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "60%",
              borderRadius: "var(--radius)",
              overflow: "hidden",
            }}>
              <img
                src="/images/office-walnut.png"
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center 30%",
                  opacity: 0.14,
                  filter: "grayscale(80%)",
                }}
              />
            </div>
            <div style={{ position: "relative", zIndex: 1 }}>
              <p className="label" style={{ margin: 0 }}>Vandaag</p>
              <h1 className="dashboard-home-title">Alles wat je vandaag moet weten.</h1>
              <p className="dashboard-home-intro">{heroMessage}</p>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} style={{ position: "relative" }}>
            {/* Subtle editorial image */}
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: "var(--radius)",
              overflow: "hidden",
              zIndex: 0,
            }}>
              <img
                src="/images/office-hero.png"
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  opacity: 0.08,
                  filter: "grayscale(100%)",
                  mixBlendMode: "multiply",
                }}
              />
            </div>
            <div className="dashboard-home-hero-stats" style={{ position: "relative", zIndex: 1 }}>
              <div className="dashboard-home-meta-item">
                <span className="label">Vrij besteedbaar</span>
                <span className="dashboard-home-meta-value">
                  {safeToSpend ? formatCurrency(safeToSpend.safeToSpend) : "—"}
                </span>
                <p className="dashboard-home-meta-sub">
                  Saldo {safeToSpend ? formatCurrency(safeToSpend.currentBalance) : "nog niet beschikbaar"}
                </p>
              </div>

              <div className="dashboard-home-meta-item">
                <span className="label">BTW deadline</span>
                <span className="dashboard-home-meta-value">
                  {vatDeadline ? `${vatDeadline.daysRemaining} dagen` : "—"}
                </span>
                <p className="dashboard-home-meta-sub">
                  {vatDeadline ? `${vatDeadline.quarter} · ${vatDeadline.deadline}` : "Geen deadline gevonden"}
                </p>
              </div>

              <div className="dashboard-home-meta-item">
                <span className="label">Openstaand bedrag</span>
                <span className="dashboard-home-meta-value">{formatCurrency(upcomingInvoiceAmount)}</span>
                <p className="dashboard-home-meta-sub">
                  {urgentInvoiceCount > 0
                    ? `${urgentInvoiceCount} achterstallig`
                    : `${upcomingInvoices?.length ?? 0} facturen op korte termijn`}
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
              label="Omzet deze maand"
              value={formatCurrency(stats.revenueThisMonth)}
              numericValue={stats.revenueThisMonth}
              sub="Betaald deze maand"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label="Openstaande facturen"
              value={String(stats.openInvoiceCount)}
              numericValue={stats.openInvoiceCount}
              isCurrency={false}
              sub={formatCurrency(stats.openInvoiceAmount)}
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label="Bonnetjes verwerkt"
              value={String(stats.receiptsThisMonth)}
              numericValue={stats.receiptsThisMonth}
              isCurrency={false}
              sub="Deze maand"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              label="BTW apart zetten"
              value={formatCurrency(stats.vatToPay)}
              numericValue={stats.vatToPay}
              sub={vatDeadline ? vatDeadline.deadline : "Dit kwartaal"}
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
          <span>Openstaande facturen</span>
          <span className="brutalist-rule" />
        </h2>
        {isLoading ? (
          <SkeletonTable />
        ) : upcomingInvoices && upcomingInvoices.length > 0 ? (
          <UpcomingInvoiceTable invoices={upcomingInvoices} />
        ) : (
          <p className="empty-state">Geen openstaande facturen</p>
        )}
      </motion.div>


    </motion.div>
  );
}
