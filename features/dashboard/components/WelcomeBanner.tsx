"use client";

import { useState } from "react";
import Link from "next/link";
import { useLocale } from "@/lib/i18n/context";

interface WelcomeBannerProps {
  hasClients: boolean;
  hasInvoices: boolean;
  hasReceipts: boolean;
}

export function WelcomeBanner({ hasClients, hasInvoices, hasReceipts }: WelcomeBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { t } = useLocale();

  // Don't show if all done or dismissed
  if (dismissed || (hasClients && hasInvoices && hasReceipts)) return null;

  const steps = [
    {
      done: hasClients,
      label: "Voeg je eerste klant toe",
      href: "/dashboard/clients/new",
    },
    {
      done: hasInvoices,
      label: "Maak je eerste factuur",
      href: "/dashboard/invoices/new",
    },
    {
      done: hasReceipts,
      label: "Upload je eerste bon",
      href: "/dashboard/receipts/new",
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;

  return (
    <div
      style={{
        padding: "28px 32px",
        border: "0.5px solid rgba(0,0,0,0.08)",
        borderRadius: "var(--radius)",
        marginBottom: 32,
        position: "relative",
      }}
    >
      <button
        onClick={() => setDismissed(true)}
        aria-label={t.common.close}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 14,
          opacity: 0.25,
          color: "var(--foreground)",
        }}
      >
        ×
      </button>

      <p className="label" style={{ margin: "0 0 4px", opacity: 0.4 }}>
        Aan de slag
      </p>
      <p
        style={{
          fontSize: "var(--text-display-sm)",
          fontWeight: 600,
          lineHeight: 1.2,
          margin: "0 0 20px",
        }}
      >
        Welkom bij VAT100
      </p>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {steps.map((step) => (
          <div
            key={step.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: step.done ? "none" : "1px solid rgba(0,0,0,0.15)",
                background: step.done ? "var(--foreground)" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "var(--background)",
                flexShrink: 0,
              }}
            >
              {step.done && "✓"}
            </span>
            {step.done ? (
              <span
                style={{
                  fontSize: "var(--text-body-md)",
                  opacity: 0.3,
                  textDecoration: "line-through",
                }}
              >
                {step.label}
              </span>
            ) : (
              <Link
                href={step.href}
                style={{
                  fontSize: "var(--text-body-md)",
                  color: "var(--foreground)",
                  textDecoration: "none",
                  fontWeight: 500,
                  opacity: 0.7,
                }}
              >
                {step.label} →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div
        style={{
          marginTop: 20,
          height: 2,
          background: "rgba(0,0,0,0.06)",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${(completedCount / steps.length) * 100}%`,
            background: "var(--foreground)",
            borderRadius: 1,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
}
