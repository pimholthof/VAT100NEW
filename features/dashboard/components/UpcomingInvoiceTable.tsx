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
      // Eno-inspired ritual: glass-ping for precision
      playSound("glass-ping");
    }
    setSendingId(null);
  };

  return (
    <div style={{ marginBottom: 120, position: "relative" }}>
      {/* Playful editorial background line */}
      <div style={{ position: "absolute", left: "5%", top: 0, bottom: 0, borderLeft: "var(--border-light)", zIndex: 0 }} />
      
      {statusMsg && <ErrorMessage>{statusMsg}</ErrorMessage>}
      
      <div style={{ 
        display: "flex", 
        flexDirection: "column", 
        gap: 160, // Extreme gap for editorial spacing
        position: "relative",
        zIndex: 1
      }}>
        {invoices.map((inv, index) => {
          const isOverdue = inv.days_overdue > 0;
          // Asymmetrical staggered layout: alternate margins
          const alignClass = index % 2 === 0 ? "items-start pl-0 lg:pl-[10%]" : "items-end pr-0 lg:pr-[10%]";
          
          return (
            <div 
              key={inv.id} 
              className={`flex flex-col relative ${alignClass}`}
            >
              {/* Top tiny label */}
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <span className="label-strong" style={{ fontSize: 10, letterSpacing: "0.1em" }}>
                  FACTURE // {inv.invoice_number}
                </span>
                <span className="label" style={{ 
                  color: isOverdue ? "#DE350B" : "inherit", 
                  opacity: isOverdue ? 1 : 0.4 
                }}>
                  [{isOverdue ? `${inv.days_overdue}D DELAY` : "ACTIVE"}]
                </span>
              </div>

              {/* Main Subject */}
              <Link
                href={`/dashboard/invoices/${inv.id}`}
                className="display-title"
                style={{
                  fontSize: "clamp(3rem, 6vw, 6rem)", // Massive scaling
                  textDecoration: "none",
                  color: "var(--foreground)",
                  lineHeight: 0.9,
                  display: "inline-block",
                  borderBottom: "4px solid transparent",
                  transition: "border-color 0.3s ease",
                  marginBottom: 24,
                  letterSpacing: "-0.04em"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--foreground)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "transparent";
                }}
              >
                {inv.client_name.toUpperCase()}
              </Link>
              
              {/* Bottom Details & Action */}
              <div style={{ display: "flex", gap: 32, alignItems: "baseline" }}>
                <span className="label-strong" style={{ fontSize: 14 }}>
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
                      opacity: sendingId === inv.id ? 0.2 : 0.8,
                    }}
                  >
                    {sendingId === inv.id ? "SYNC..." : "PING STUREN"}
                  </button>
                ) : (
                  <span className="label" style={{ opacity: 0.2 }}>
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
