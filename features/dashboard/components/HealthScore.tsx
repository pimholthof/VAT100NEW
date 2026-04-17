"use client";

import Link from "next/link";
import { m as motion } from "framer-motion";
import type { FinancialHealth, HealthFactor } from "@/lib/tax/financial-health";

interface Signal {
  factor: HealthFactor;
  severity: "urgent" | "attention" | "ok";
  href?: string;
  cta?: string;
}

const FACTOR_LINKS: Record<string, { href: string; cta: string }> = {
  Betaalsnelheid: { href: "/dashboard/invoices", cta: "Bekijk facturen" },
  Openstaand: { href: "/dashboard/invoices", cta: "Naar facturen" },
  Reserve: { href: "/dashboard/tax", cta: "Naar BTW" },
  Administratie: { href: "/dashboard/receipts/new", cta: "Voeg bon toe" },
};

function severityFromScore(score: number): Signal["severity"] {
  if (score < 40) return "urgent";
  if (score < 70) return "attention";
  return "ok";
}

function toSignals(factors: HealthFactor[]): Signal[] {
  return factors
    .map<Signal>((factor) => ({
      factor,
      severity: severityFromScore(factor.score),
      ...(FACTOR_LINKS[factor.name] ?? {}),
    }))
    .sort((a, b) => {
      const order = { urgent: 0, attention: 1, ok: 2 };
      return order[a.severity] - order[b.severity] || a.factor.score - b.factor.score;
    });
}

function SeverityMark({ severity }: { severity: Signal["severity"] }) {
  const color =
    severity === "urgent"
      ? "var(--color-accent)"
      : severity === "attention"
      ? "var(--color-warning)"
      : "var(--color-success)";
  const label =
    severity === "urgent" ? "Urgent" : severity === "attention" ? "Aandacht" : "In orde";
  return (
    <span
      aria-label={label}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        marginTop: 8,
      }}
    />
  );
}

export function HealthScore({ health }: { health: FinancialHealth }) {
  const signals = toSignals(health.factors);
  const needsAttention = signals.filter((s) => s.severity !== "ok");
  const allGood = needsAttention.length === 0;
  const visibleSignals = allGood ? signals : needsAttention;

  const headline = allGood
    ? "Alles in orde"
    : needsAttention.length === 1
    ? "Eén punt vraagt aandacht"
    : `${needsAttention.length} punten vragen aandacht`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      aria-label="Financiële gezondheid"
      style={{
        padding: "clamp(28px, 4vw, 40px)",
        border: "0.5px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "var(--radius)",
        background: "var(--dashboard-surface, var(--background))",
      }}
    >
      <p
        className="label"
        style={{
          margin: 0,
          opacity: 0.45,
          fontSize: 10,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        Financiële gezondheid
      </p>
      <p
        style={{
          fontSize: "clamp(22px, 3vw, 28px)",
          fontWeight: 400,
          margin: "8px 0 24px",
          letterSpacing: "-0.02em",
          lineHeight: 1.25,
          color: "var(--foreground)",
        }}
      >
        {headline}
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {visibleSignals.map((signal, index) => (
          <motion.li
            key={signal.factor.name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.3,
              delay: 0.05 + index * 0.04,
              ease: [0.16, 1, 0.3, 1],
            }}
            style={{
              padding: "16px 0",
              borderTop: "0.5px solid rgba(0, 0, 0, 0.06)",
              display: "flex",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <SeverityMark severity={signal.severity} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  fontWeight: 500,
                  opacity: 0.5,
                  marginBottom: 4,
                }}
              >
                {signal.factor.name}
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.45,
                  letterSpacing: "-0.005em",
                  color: "var(--foreground)",
                  opacity: signal.severity === "ok" ? 0.55 : 0.9,
                }}
              >
                {signal.factor.message}
              </p>
            </div>
            {signal.severity !== "ok" && signal.href && signal.cta && (
              <Link
                href={signal.href}
                style={{
                  alignSelf: "center",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "8px 14px",
                  border: "0.5px solid rgba(0,0,0,0.12)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--foreground)",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {signal.cta}
              </Link>
            )}
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
