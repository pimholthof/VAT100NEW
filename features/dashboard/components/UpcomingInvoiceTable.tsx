"use client";

import { useState } from "react";
import Link from "next/link";
import type { UpcomingInvoice } from "@/features/dashboard/actions";
import { sendReminder } from "@/features/invoices/actions";
import { formatCurrency } from "@/lib/format";
import { playSound } from "@/lib/utils/sound";
import { useToast } from "@/components/ui";
import { useLocale } from "@/lib/i18n/context";

export function UpcomingInvoiceTable({ invoices }: { invoices: UpcomingInvoice[] }) {
  const { t } = useLocale();
  const { toast } = useToast();
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleSendReminder = async (invoiceId: string) => {
    setSendingId(invoiceId);
    const res = await sendReminder(invoiceId);
    if (res.error) {
      toast(res.error, "error");
    } else {
      toast(t.dashboard.reminderSent);
      playSound("glass-ping");
    }
    setSendingId(null);
  };

  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        border: "0.5px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "var(--radius)",
        overflow: "hidden",
      }}>
        {invoices.map((inv, idx) => {
          const isOverdue = inv.days_overdue > 0;

          return (
            <div
              key={inv.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 20,
                padding: "20px 24px",
                borderBottom: idx < invoices.length - 1 ? "0.5px solid rgba(0,0,0,0.05)" : "none",
                flexWrap: "wrap",
                background: "var(--dashboard-surface, var(--background))",
                transition: "background 0.15s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                <span className="label" style={{
                  opacity: 0.2,
                  flexShrink: 0,
                  fontSize: 10,
                }}>
                  {inv.invoice_number}
                </span>

                <Link
                  href={`/dashboard/invoices/${inv.id}`}
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    textDecoration: "none",
                    color: "var(--foreground)",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {inv.client_name}
                </Link>

                {isOverdue && (
                  <span className="status-badge status-badge--overdue" style={{ flexShrink: 0, fontSize: 9 }}>
                    {inv.days_overdue}D
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 20, flexShrink: 0 }}>
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
                    aria-busy={sendingId === inv.id || undefined}
                    className="label-strong"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: sendingId === inv.id ? "not-allowed" : "pointer",
                      padding: "4px 0",
                      opacity: sendingId === inv.id ? 0.3 : 0.55,
                      transition: "opacity 0.15s ease",
                      fontSize: 10,
                    }}
                  >
                    {sendingId === inv.id ? "Versturen…" : t.dashboard.remind}
                  </button>
                ) : (
                  <span className="label" style={{ opacity: 0.12, fontSize: 10 }}>
                    {t.dashboard.noEmail}
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
