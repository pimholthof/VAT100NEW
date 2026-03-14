"use client";

import { useState } from "react";
import { sendInvoice } from "@/lib/actions/invoices";

export function SendEmailButton({
  invoiceId,
  clientEmail,
}: {
  invoiceId: string;
  clientEmail: string;
}) {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleSend = async () => {
    setSending(true);
    setMsg(null);
    const res = await sendInvoice(invoiceId);
    if (res.error) {
      setMsg(res.error);
    } else {
      setMsg(`Verstuurd naar ${clientEmail}`);
    }
    setSending(false);
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        style={{
          fontSize: "var(--text-body-md)",
          fontFamily: "var(--font-body), sans-serif",
          fontWeight: 500,
          color: "var(--foreground)",
          letterSpacing: "0.05em",
          padding: "8px 20px",
          border: "1px solid rgba(13, 13, 11, 0.2)",
          background: "transparent",
          cursor: sending ? "default" : "pointer",
          opacity: sending ? 0.5 : 1,
        }}
      >
        {sending ? "Verzenden..." : "E-mail"}
      </button>
      {msg && (
        <span
          style={{
            fontSize: "var(--text-body-sm)",
            fontFamily: "var(--font-body), sans-serif",
            fontWeight: 400,
            color: "var(--foreground)",
          }}
        >
          {msg}
        </span>
      )}
    </span>
  );
}
