"use client";

import { useQuery } from "@tanstack/react-query";
import { m as motion } from "framer-motion";
import { formatCurrency, formatDateLong } from "@/lib/format";
import { getControllerAuditHistory } from "@/features/dashboard/actions";
import { PageHeader, SkeletonTable } from "@/components/ui";

interface AuditReceipt {
  vendor_name?: string;
  amount_inc_vat: number;
  receipt_date: string;
}

interface TaxAuditFindings {
  missing_receipts: AuditReceipt[];
  unlinked_invoices: Record<string, unknown>[];
  hours_gap: number;
  anomalies: Record<string, unknown>[];
}

interface TaxAudit {
  id: string;
  quarter: number;
  year: number;
  score: number;
  findings: TaxAuditFindings | null;
  status: string;
  created_at: string;
}

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

export default function AdminAuditPage() {
  const { data: auditResult, isLoading } = useQuery({
    queryKey: ["admin-tax-audits"],
    queryFn: () => getControllerAuditHistory(),
  });

  const audits = (auditResult?.data as TaxAudit[]) || [];

  return (
    <div>
      <PageHeader title="Fiscale Controle" backHref="/admin" backLabel="Beheer" />

      <p style={{ fontSize: "var(--text-body-md)", opacity: 0.5, maxWidth: 600, marginBottom: 48, lineHeight: 1.6 }}>
        Overzicht van alle automatische scans op de administratie.
        Afwijkingen worden hier gerapporteerd voor directe actie.
      </p>

      {isLoading ? (
        <SkeletonTable rows={3} columns="1fr 1fr 1fr 1fr" headerWidths={[40, 50, 60, 40]} bodyWidths={[30, 40, 50, 30]} />
      ) : audits.length === 0 ? (
        <p className="empty-state">Nog geen audithistorie gevonden</p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          {audits.map((audit) => (
            <motion.div
              key={audit.id}
              variants={staggerItem}
              className="brutalist-panel"
            >
              {/* Audit header */}
              <div className="brutalist-panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <span className="label" style={{ marginBottom: 4, display: "block" }}>
                    {formatDateLong(audit.created_at)}
                  </span>
                  <h2 style={{ fontSize: "var(--text-display-sm)", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
                    K{audit.quarter} {audit.year}
                  </h2>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <div style={{ textAlign: "right" }}>
                    <span className="label" style={{ display: "block", marginBottom: 4 }}>Score</span>
                    <span
                      className="mono-amount-lg"
                      style={{
                        fontSize: "2rem",
                        fontWeight: 400,
                        color: audit.score > 90 ? "var(--color-success)" : "var(--color-warning)",
                      }}
                    >
                      {audit.score}%
                    </span>
                  </div>
                  <span
                    className="label-strong"
                    style={{
                      padding: "4px 12px",
                      border: `1px solid ${audit.score > 90 ? "var(--color-success)" : "var(--color-warning)"}`,
                      borderRadius: "9999px",
                      color: audit.score > 90 ? "var(--color-success)" : "var(--color-warning)",
                      fontSize: 9,
                    }}
                  >
                    {audit.status === "clean" ? "Schoon" : audit.status}
                  </span>
                </div>
              </div>

              {/* Bevindingen */}
              <div className="brutalist-panel-padded">
                <h3 className="label" style={{ marginBottom: 20 }}>Bevindingen</h3>

                {/* Missende bonnetjes */}
                {(audit.findings?.missing_receipts?.length ?? 0) > 0 ? (
                  audit.findings!.missing_receipts.map((r, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                        padding: "16px 0",
                        borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <div>
                        <p style={{ fontWeight: 500, fontSize: "var(--text-body-md)", margin: "0 0 4px" }}>
                          Missend bewijsstuk: {r.vendor_name || "Onbekend"}
                        </p>
                        <p className="label">
                          Geen factuur gevonden voor {formatCurrency(r.amount_inc_vat)} op{" "}
                          {new Date(r.receipt_date).toLocaleDateString("nl-NL")}
                        </p>
                      </div>
                      <span
                        className="label-strong"
                        style={{
                          padding: "4px 12px",
                          background: "rgba(165,28,48,0.08)",
                          color: "var(--color-accent)",
                          borderRadius: "9999px",
                          fontSize: 9,
                        }}
                      >
                        Actie vereist
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="label" style={{ padding: "16px 0" }}>
                    Geen afwijkingen gevonden in bonnetjes
                  </p>
                )}

                {/* Urencriterium */}
                {audit.findings && "hours_gap" in audit.findings && audit.findings.hours_gap > 0 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                      padding: "16px 0",
                      borderBottom: "0.5px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: 500, fontSize: "var(--text-body-md)", margin: "0 0 4px" }}>
                        Urencriterium (1.225 uur)
                      </p>
                      <p className="label">
                        Circa {Math.round(audit.findings.hours_gap)} uur tekort op huidige kwartaalnorm
                      </p>
                    </div>
                    <span
                      className="label-strong"
                      style={{
                        padding: "4px 12px",
                        background: "rgba(180,83,9,0.08)",
                        color: "var(--color-warning)",
                        borderRadius: "9999px",
                        fontSize: 9,
                      }}
                    >
                      Monitoren
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
