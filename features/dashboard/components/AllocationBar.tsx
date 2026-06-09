"use client";

import Link from "next/link";
import { useMemo } from "react";
import { m as motion } from "framer-motion";
import { useLocale } from "@/lib/i18n/context";
import { formatCurrency } from "@/lib/format";
import type { SafeToSpendData } from "@/lib/types";

/**
 * De Drie Potten — het visuele hart van VAT100.
 *
 * Elke euro op je rekening staat in precies één van drie toestanden:
 *  🔵 Van de Belastingdienst (BTW die je bewaart)
 *  🟠 Gereserveerd (inkomstenbelasting)
 *  ⚫ Van jou (veilig te besteden)
 *
 * Eén proportionele balk vertaalt je saldo naar die ene waarheid: wat is
 * werkelijk van mij? Geen beheer, geen invoer — alleen rust.
 */
export function AllocationBar({
  data,
  hasBankConnection = false,
}: {
  data?: SafeToSpendData;
  hasBankConnection?: boolean;
}) {
  const { t } = useLocale();
  const a = t.dashboard;

  const total = data?.currentBalance ?? 0;

  // Segmenten sluiten exact op het saldo aan: BTW en IB-reservering eerst,
  // de rest is van jou. Clampen voorkomt rare breedtes bij een krap saldo.
  const { vat, ib, yours } = useMemo(() => {
    if (!data || total <= 0) return { vat: 0, ib: 0, yours: 0 };
    const vatPart = Math.max(0, Math.min(data.estimatedVat, total));
    const ibPart = Math.max(0, Math.min(data.estimatedIncomeTax, total - vatPart));
    return { vat: vatPart, ib: ibPart, yours: Math.max(0, total - vatPart - ibPart) };
  }, [data, total]);

  // Geen bank gekoppeld → uitnodigende lege staat in plaats van een lege balk.
  if (!data || total <= 0) {
    return (
      <section className="glass" style={{ borderRadius: "var(--radius-lg)", padding: "28px 32px" }}>
        <span className="label">{a.allocHeading}</span>
        <p style={{ margin: "14px 0 0", fontSize: "var(--text-body-md)", opacity: 0.55, lineHeight: 1.6, maxWidth: "32rem" }}>
          {hasBankConnection ? a.allocNoBalance : a.allocEmpty}
        </p>
        {!hasBankConnection && (
          <Link
            href="/dashboard/bank"
            style={{
              display: "inline-block",
              marginTop: 14,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--color-accent)",
              textDecoration: "none",
              letterSpacing: "0.01em",
            }}
          >
            {a.allocConnectBank}
          </Link>
        )}
      </section>
    );
  }

  const segments = [
    { key: "vat", value: vat, label: a.allocVat, sub: a.allocVatSub, color: "var(--color-info)" },
    { key: "ib", value: ib, label: a.allocIb, sub: a.allocIbSub, color: "var(--color-warning)" },
    { key: "yours", value: yours, label: a.allocYours, sub: a.allocYoursSub, color: "var(--foreground)" },
  ];

  return (
    <section className="glass" style={{ borderRadius: "var(--radius-lg)", padding: "28px 32px" }}>
      {/* ── Kop ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 18 }}>
        <span className="label">{a.allocHeading}</span>
        <span className="mono-amount" style={{ fontSize: 12, opacity: 0.45 }}>
          {a.allocTotal} {formatCurrency(total)}
        </span>
      </div>

      {/* ── De balk: drie toestanden, proportioneel ── */}
      <div
        role="img"
        aria-label={`${a.allocVat} ${formatCurrency(vat)}, ${a.allocIb} ${formatCurrency(ib)}, ${a.allocYours} ${formatCurrency(yours)}`}
        style={{ display: "flex", height: 16, borderRadius: 999, overflow: "hidden", background: "rgba(0,0,0,0.04)", gap: 2 }}
      >
        {segments.map((s) =>
          s.value <= 0 ? null : (
            <motion.div
              key={s.key}
              initial={{ flexGrow: 0 }}
              animate={{ flexGrow: s.value }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ background: s.color, flexBasis: 0, minWidth: 3 }}
            />
          ),
        )}
      </div>

      {/* ── Legenda: de drie potten benoemd ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 20,
          marginTop: 22,
        }}
      >
        {segments.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          return (
            <div key={s.key} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: "var(--text-body-sm)", fontWeight: 600 }}>{s.label}</span>
              </span>
              <span className="mono-amount" style={{ fontSize: "var(--text-mono-md)", color: s.color === "var(--foreground)" ? "var(--foreground)" : s.color }}>
                {formatCurrency(s.value)}
              </span>
              <span style={{ fontSize: 11, opacity: 0.5, lineHeight: 1.4 }}>
                {pct}% · {s.sub}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
