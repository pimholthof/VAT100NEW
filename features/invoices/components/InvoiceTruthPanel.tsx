"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { m as motion } from "framer-motion";

import { useLocale } from "@/lib/i18n/context";
import { useInvoiceStore } from "@/lib/store/invoice";
import { getProfile } from "@/features/profile/actions";
import { calculateInvoiceTruth } from "@/lib/logic/fiscal-truth";
import { formatCurrency } from "@/lib/format";

/**
 * Het waarheid-paneel: terwijl je een factuur opstelt, toont dit live wat er
 * werkelijk van jou is. De factuur is de input, dit is de output — op één
 * scherm. Hergebruikt exact dezelfde rekenkern als de server en het dashboard.
 */
export function InvoiceTruthPanel() {
  const { t } = useLocale();

  const totals = useInvoiceStore((s) => s.totals);
  const vatRate = useInvoiceStore((s) => s.vatRate);
  const vatScheme = useInvoiceStore((s) => s.vatScheme);

  const { data: profileResult } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
    staleTime: 5 * 60_000,
  });
  const profile = profileResult?.data ?? null;

  const truth = useMemo(
    () =>
      calculateInvoiceTruth({
        subtotalExVat: totals.subtotal,
        vatRate,
        vatAmount: totals.vatAmount,
        profile: {
          estimatedAnnualIncome: profile?.estimated_annual_income ?? null,
          meetsUrencriterium: profile?.meets_urencriterium ?? false,
          usesKor: profile?.uses_kor ?? false,
        },
      }),
    [totals.subtotal, totals.vatAmount, vatRate, profile],
  );

  const tv = t.invoices;
  const isEmpty = truth.net <= 0;

  // BTW-regel: bij 0% leggen we uit wáárom er geen BTW is.
  const vatNote =
    truth.btw > 0
      ? tv.truthVatHeldHint
      : vatScheme === "eu_reverse_charge"
        ? tv.truthReverseChargeNote
        : vatScheme === "export_outside_eu"
          ? tv.truthExportNote
          : tv.truthExemptNote;

  return (
    <div
      className="glass"
      style={{
        borderRadius: "var(--radius-lg)",
        padding: "26px 30px",
        marginBottom: 80,
      }}
    >
      {/* ── Kop ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: isEmpty ? 0 : 20,
        }}
      >
        <span className="label">{tv.truthHeading}</span>
        {!isEmpty && (
          <span
            className="mono-amount"
            style={{ fontSize: 11, opacity: 0.45, letterSpacing: "0.02em" }}
          >
            {truth.personalised
              ? tv.truthPersonalised
              : tv.truthMarginalRate.replace(
                  "{rate}",
                  String(Math.round(truth.marginalRate * 100)),
                )}
          </span>
        )}
      </div>

      {isEmpty ? (
        <p
          style={{
            margin: "14px 0 0",
            fontSize: "var(--text-body-sm)",
            opacity: 0.5,
            lineHeight: 1.5,
          }}
        >
          {tv.truthEmpty}
        </p>
      ) : (
        <>
          {/* ── BTW: niet van jou ── */}
          <Row
            label={tv.truthVatHeld.replace("{rate}", String(truth.vatRate))}
            sub={vatNote}
            amount={formatCurrency(truth.btw)}
            color="var(--color-info)"
          />

          {/* ── IB-reservering ── */}
          <Row
            label={tv.truthIncomeTax}
            sub={tv.truthMarginalRate.replace(
              "{rate}",
              String(Math.round(truth.marginalRate * 100)),
            )}
            amount={formatCurrency(truth.incomeTaxReserve)}
            color="var(--color-warning)"
            borderTop
          />

          {/* ── Van jou: de uitkomst ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              paddingTop: 18,
              marginTop: 6,
              borderTop: "0.5px solid rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              <span
                aria-hidden
                style={{
                  width: 3,
                  height: 22,
                  borderRadius: 2,
                  background: "var(--color-accent)",
                }}
              />
              <span className="label-strong">{tv.truthYours}</span>
            </div>
            <motion.div
              key={truth.yours}
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
              <span
                className="mono-amount"
                style={{
                  fontSize: "2.6rem",
                  fontWeight: 400,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                  color: "var(--foreground)",
                }}
              >
                {formatCurrency(truth.yours)}
              </span>
            </motion.div>
          </div>

          {/* ── Voetnoot + (optioneel) zet-je-inkomen-hint ── */}
          <div style={{ marginTop: 18 }}>
            <p
              style={{
                margin: 0,
                fontSize: 10.5,
                opacity: 0.4,
                lineHeight: 1.5,
                letterSpacing: "0.01em",
              }}
            >
              {tv.truthDisclaimer}
            </p>
            {!truth.personalised && (
              <Link
                href="/dashboard/settings"
                style={{
                  display: "inline-block",
                  marginTop: 8,
                  fontSize: 11,
                  fontWeight: 500,
                  color: "var(--color-accent)",
                  textDecoration: "none",
                  letterSpacing: "0.01em",
                }}
              >
                {tv.truthSetIncome}
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  sub,
  amount,
  color,
  borderTop = false,
}: {
  label: string;
  sub: string;
  amount: string;
  color: string;
  borderTop?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 16,
        paddingTop: borderTop ? 14 : 0,
        paddingBottom: 14,
        borderTop: borderTop ? "0.5px solid rgba(0,0,0,0.06)" : "none",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: "var(--text-body-sm)", fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ fontSize: 11, opacity: 0.5, lineHeight: 1.4 }}>
          {sub}
        </span>
      </div>
      <span
        className="mono-amount"
        style={{ fontSize: "var(--text-mono-md)", color, whiteSpace: "nowrap" }}
      >
        {amount}
      </span>
    </div>
  );
}
