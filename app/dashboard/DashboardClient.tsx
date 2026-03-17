"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, type Variants } from "framer-motion";
import Link from "next/link";
import {
  getDashboardData,
  type UpcomingInvoice,
  type DashboardData,
} from "@/lib/actions/dashboard";
import type { ActionResult } from "@/lib/types";
import { sendReminder } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/format";
import { playSound } from "@/lib/utils/sound";

import {
  StatCard,
  SkeletonCard,
  SkeletonTable,
  Th,
  Td,
  ErrorMessage,
  ButtonSecondary,
} from "@/components/ui";
import { ActionFeed } from "@/components/dashboard/ActionFeed";
import { SafeToSpendRing } from "@/components/dashboard/SafeToSpendRing";
import { QuickReceiptUpload } from "@/components/dashboard/QuickReceiptUpload";

import { CashflowChart } from "@/components/dashboard/CashflowChart";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { SetupChecklist } from "@/components/dashboard/SetupChecklist";
import { VatDeadlineBanner } from "@/components/dashboard/VatDeadlineBanner";

function getCurrentMonth(): string {
  return new Date().toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

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
  const cashflow = data?.cashflow;
  const vatDeadline = data?.vatDeadline;
  const safeToSpend = data?.safeToSpend;

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className="dashboard-content"
      style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(12, 1fr)", 
        gap: 24,
        paddingBottom: 120 // Space for floating bar
      }}
    >
      {/* ── Hero: Safe to Spend (8 cols) ── */}
      {safeToSpend && !isLoading && (
        <motion.div 
          variants={itemVariants} 
          className="glass" 
          style={{ 
            gridColumn: "span 8", 
            padding: "60px 80px",
            borderRadius: 0,
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <p className="label" style={{ opacity: 0.4, marginBottom: 8 }}>Safe to Spend</p>
              <AnimatedNumber 
                value={safeToSpend.safeToSpend} 
                style={{
                  fontFamily: "var(--font-geist), sans-serif",
                  fontSize: "clamp(3rem, 8vw, 6rem)",
                  fontWeight: 700,
                  lineHeight: 0.9,
                  letterSpacing: "-0.04em",
                }}
              />
            </div>
            <div style={{ marginLeft: 40 }}>
              <SafeToSpendRing 
                percentage={safeToSpend.currentBalance > 0 ? safeToSpend.safeToSpend / safeToSpend.currentBalance : 0} 
                size={160}
                strokeWidth={10}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 32, marginTop: 40, borderTop: "var(--border-rule)", paddingTop: 24 }}>
            <div>
              <p className="label" style={{ opacity: 0.4, marginBottom: 4 }}>Saldo</p>
              <p style={{ fontSize: 16 }}>{formatCurrency(safeToSpend.currentBalance)}</p>
            </div>
            <div>
              <p className="label" style={{ opacity: 0.4, marginBottom: 4 }}>BTW Reserve</p>
              <p style={{ fontSize: 16, color: "var(--color-accent)" }}>{formatCurrency(safeToSpend.estimatedVat)}</p>
            </div>
            {safeToSpend.taxShieldPotential > 0 && (
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <p className="label" style={{ opacity: 0.5, marginBottom: 4, color: "var(--color-accent)" }}>Tax Shield Potential</p>
                <p style={{ fontSize: 16, fontWeight: 600 }}>{formatCurrency(safeToSpend.taxShieldPotential)}</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Action Feed (4 cols, tall) ── */}
      {!isLoading && (
        <motion.div 
          variants={itemVariants}
          className="glass"
          style={{ 
            gridColumn: "span 4", 
            gridRow: "span 2",
            borderRadius: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}
        >
          <div style={{ padding: "24px 24px 12px", borderBottom: "var(--border-rule)" }}>
             <p className="label">Inbox Zero</p>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0 12px 24px" }}>
            <ActionFeed />
          </div>
        </motion.div>
      )}

      {/* ── Stats (2x 4 cols) ── */}
      {!isLoading && stats && (
        <>
          <motion.div variants={itemVariants} style={{ gridColumn: "span 4" }}>
            <StatCard
              label="Open facturen"
              value={String(stats.openInvoiceCount)}
              numericValue={stats.openInvoiceCount}
              sub={formatCurrency(stats.openInvoiceAmount)}
            />
          </motion.div>
          <motion.div variants={itemVariants} style={{ gridColumn: "span 4" }}>
            <StatCard
              label="BTW te betalen"
              value={formatCurrency(stats.vatToPay)}
              numericValue={stats.vatToPay}
              sub="Kwartaal overzicht"
            />
          </motion.div>
          <motion.div 
            variants={itemVariants} 
            style={{ gridColumn: "span 4" }}
          >
            <StatCard
              label="Bonnen deze maand"
              value={String(stats.receiptsThisMonth)}
              numericValue={stats.receiptsThisMonth}
              sub="Kostenbeheer status: Actief"
            />
          </motion.div>
        </>
      )}

      {/* ── Cashflow Chart (8 cols) ── */}
      {cashflow && (
        <motion.div 
          variants={itemVariants}
          className="glass"
          style={{ 
            gridColumn: "span 8", 
            padding: 32, 
            borderRadius: 0
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
            <p className="label">Cashflow</p>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent)" }} />
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.1)" }} />
            </div>
          </div>
          <CashflowChart cashflow={cashflow} />
        </motion.div>
      )}

      {/* ── Quick Upload (4 cols) ── */}
      {!isLoading && (
        <motion.div 
          variants={itemVariants}
          className="glass"
          style={{ 
            gridColumn: "span 4",
            padding: 24,
            borderRadius: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            textAlign: "center"
          }}
        >
          <QuickReceiptUpload />
        </motion.div>
      )}

      {/* ── BTW Deadline (Full width) ── */}
      {vatDeadline && (
        <motion.div variants={itemVariants} style={{ gridColumn: "span 12" }}>
          <VatDeadlineBanner deadline={vatDeadline} />
        </motion.div>
      )}

      {/* ── Openstaande facturen (Full width) ── */}
      <motion.div variants={itemVariants} style={{ gridColumn: "span 12", marginTop: 40 }}>
        <h2 className="section-header" style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
          Facturen overzicht
          <span style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.05)" }} />
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



/* ── Upcoming Invoice Table ── */

function UpcomingInvoiceTable({ invoices }: { invoices: UpcomingInvoice[] }) {
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSendReminder = async (invoiceId: string) => {
    setSendingId(invoiceId);
    setStatusMsg(null);
    const res = await sendReminder(invoiceId);
    if (res.error) {
      setStatusMsg(res.error);
    } else {
      setStatusMsg("Herinnering verzonden.");
      playSound("tink");
    }
    setSendingId(null);
  };

  return (
    <div style={{ marginBottom: "var(--space-block)" }}>
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", borderSpacing: 0 }}>
          <thead>
            <tr style={{ borderBottom: "0.5px solid rgba(13,13,11,0.15)" }}>
              <Th>Klant</Th>
              <Th>Factuurnr</Th>
              <Th style={{ textAlign: "right" }}>Bedrag</Th>
              <Th>Status</Th>
              <Th style={{ width: 160 }}>Actie</Th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const isOverdue = inv.days_overdue > 0;
              return (
                <tr key={inv.id} style={{ borderBottom: "0.5px solid rgba(13,13,11,0.06)" }}>
                  <Td
                    style={{
                      borderLeft: isOverdue
                        ? "2px solid var(--foreground)"
                        : "2px solid transparent",
                      fontWeight: 400,
                    }}
                  >
                    {inv.client_name}
                  </Td>
                  <Td>
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      style={{
                        fontFamily: "var(--font-mono), monospace",
                        fontSize: "var(--text-mono-md)",
                        fontWeight: 400,
                        color: "var(--foreground)",
                        textDecoration: "none",
                      }}
                    >
                      {inv.invoice_number}
                    </Link>
                  </Td>
                  <Td style={{ textAlign: "right" }}>
                    <span className="mono-amount">
                      {formatCurrency(inv.total_inc_vat)}
                    </span>
                  </Td>
                  <Td>
                    <span className="label" style={{ opacity: 1 }}>
                      {isOverdue
                        ? `${inv.days_overdue}d verlopen`
                        : inv.days_overdue === 0
                          ? "Vandaag"
                          : `${Math.abs(inv.days_overdue)}d`}
                    </span>
                  </Td>
                  <Td>
                    {inv.client_email ? (
                      <ButtonSecondary
                        onClick={() => handleSendReminder(inv.id)}
                        disabled={sendingId === inv.id}
                      >
                        {sendingId === inv.id
                          ? "Verzenden..."
                          : "Stuur herinnering"}
                      </ButtonSecondary>
                    ) : (
                      <span className="label" style={{ opacity: 0.3 }}>
                        Geen e-mail
                      </span>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

