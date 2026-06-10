"use client";

import { m as motion } from "framer-motion";
import Link from "next/link";

interface TaxAuditCardProps {
  score: number;
  findingsCount: number;
  status: string;
  quarter: number;
  year: number;
}

export function TaxAuditCard({ score, findingsCount, status, quarter, year }: TaxAuditCardProps) {
  const scoreColor =
    score > 90
      ? "var(--color-success)"
      : score > 70
        ? "var(--color-warning)"
        : "var(--color-overdue)";
  const dotColor = score > 70 ? "var(--color-success)" : "var(--color-overdue)";

  return (
    <Link href="/admin/audit" style={{ display: "block", textDecoration: "none", color: "inherit" }}>
      <motion.div
        whileHover={{ y: -2 }}
        className="glass"
        style={{ padding: 32, borderRadius: "var(--radius)" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div>
            <p className="label" style={{ margin: "0 0 8px" }}>
              Fiscale gezondheid — Q{quarter} {year}
            </p>
            <h3 className="section-header">Tax Auditor</h3>
          </div>
          <span
            className="mono-amount-lg"
            style={{ fontWeight: 600, color: scoreColor }}
          >
            {score}%
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span
            aria-hidden
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: dotColor,
            }}
          />
          <span className="label">{status}</span>
        </div>

        <p style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.6, margin: 0 }}>
          {findingsCount > 0
            ? `${findingsCount} aandachtspunten gevonden in je administratie. Klik voor details.`
            : "Je administratie is volledig fiscus-proof. Geen actie vereist."}
        </p>

        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: "var(--border-light)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span className="label">Bekijk auditlog</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            style={{ opacity: 0.4 }}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </motion.div>
    </Link>
  );
}
