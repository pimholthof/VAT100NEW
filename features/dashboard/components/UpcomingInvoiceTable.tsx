"use client";

import { useState } from "react";
import Link from "next/link";
import type { UpcomingInvoice } from "@/features/dashboard/actions";
import { sendReminder } from "@/features/invoices/actions";
import { formatCurrency } from "@/lib/format";
import { playSound } from "@/lib/utils/sound";
import { ErrorMessage } from "@/components/ui";

export function UpcomingInvoiceTable({ invoices }: { invoices: UpcomingInvoice[] }) {
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
      playSound("glass-ping");
    }
    setSendingId(null);
  };

  return (
    <div style={{ position: "relative" }}>
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}

      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}>
        {invoices.map((inv) => {
          const isOverdue = inv.days_overdue > 0;

          return (
            <div
              key={inv.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 24,
                padding: "24px 0",
                borderBottom: "0.5px solid rgba(0,0,0,0.04)",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 16, flex: 1, minWidth: 0 }}>
                <span className="label" style={{
                  opacity: 0.25,
                  flexShrink: 0,
                }}>
                  {inv.invoice_number}
                </span>

                <Link
                  href={`/dashboard/invoices/${inv.id}`}
                  style={{
                    fontSize: "clamp(1.25rem, 3vw, 2rem)",
                    fontWeight: 600,
                    letterSpacing: "-0.02em",
                    textDecoration: "none",
                    color: "var(--foreground)",
                    lineHeight: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {inv.client_name}
                </Link>

                {isOverdue && (
                  <span className="status-badge status-badge--overdue" style={{ flexShrink: 0 }}>
                    {inv.days_overdue}D
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 24, flexShrink: 0 }}>
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  color: isOverdue ? "var(--color-accent)" : "var(--foreground)",
                }}>
                  {formatCurrency(inv.total_inc_vat)}
                </span>

                {inv.client_email ? (
                  <button
                    onClick={() => handleSendReminder(inv.id)}
                    disabled={sendingId === inv.id}
                    className="label-strong"
                    style={{
                      background: "transparent",
                      border: "none",
                      borderBottom: "1px solid var(--foreground)",
                      cursor: "pointer",
                      padding: "0 0 2px 0",
                      opacity: sendingId === inv.id ? 0.2 : 0.6,
                      transition: "opacity 0.15s ease",
                    }}
                  >
                    {sendingId === inv.id ? "SYNC..." : "HERINNEREN"}
                  </button>
                ) : (
                  <span className="label" style={{ opacity: 0.15 }}>
                    GEEN E-MAIL
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
