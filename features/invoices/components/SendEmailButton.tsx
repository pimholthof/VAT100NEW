"use client";

import { useState, useEffect } from "react";
import { sendInvoice } from "@/features/invoices/actions";

export function SendEmailButton({
  invoiceId,
  clientEmail,
}: {
  invoiceId: string;
  clientEmail: string;
}) {
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  // Auto-clear success message na 5 seconden
  useEffect(() => {
    if (msg && !isError) {
      const timer = setTimeout(() => setMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [msg, isError]);

  const handleSend = async () => {
    setSending(true);
    setMsg(null);
    setIsError(false);
    const res = await sendInvoice(invoiceId);
    if (res.error) {
      setMsg(res.error);
      setIsError(true);
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
        aria-busy={sending}
        style={{
          fontSize: "var(--text-body-md)",
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
      <span aria-live="polite">
        {msg && (
          <span
            style={{
              fontSize: "var(--text-body-sm)",
              fontWeight: 400,
              color: isError ? "var(--color-accent)" : "var(--foreground)",
            }}
          >
            {msg}
          </span>
        )}
      </span>
    </span>
  );
}
