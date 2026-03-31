"use client";

import { useState, useEffect } from "react";
import { createPaymentLink } from "@/features/invoices/actions";

export function PaymentLinkButton({
  invoiceId,
  existingLink,
}: {
  invoiceId: string;
  existingLink: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [link, setLink] = useState(existingLink);

  useEffect(() => {
    if (msg && !isError) {
      const timer = setTimeout(() => setMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [msg, isError]);

  const handleCreate = async () => {
    setLoading(true);
    setMsg(null);
    setIsError(false);

    const res = await createPaymentLink(invoiceId);
    if (res.error) {
      setMsg(res.error);
      setIsError(true);
    } else if (res.data) {
      setLink(res.data.paymentLink);
      await navigator.clipboard.writeText(res.data.paymentLink).catch(() => {});
      setMsg("Betaallink aangemaakt en gekopieerd");
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link).catch(() => {});
    setMsg("Link gekopieerd");
    setIsError(false);
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "12px" }}>
      {link ? (
        <button
          type="button"
          onClick={handleCopy}
          style={{
            fontSize: "var(--text-body-md)",
            fontWeight: 500,
            color: "#A51C30",
            letterSpacing: "0.05em",
            padding: "8px 20px",
            border: "1px solid #A51C30",
            borderRadius: "var(--radius-sm)",
            background: "transparent",
            cursor: "pointer",
          }}
        >
          Kopieer betaallink
        </button>
      ) : (
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          aria-busy={loading}
          style={{
            fontSize: "var(--text-body-md)",
            fontWeight: 500,
            color: "#A51C30",
            letterSpacing: "0.05em",
            padding: "8px 20px",
            border: "1px solid #A51C30",
            borderRadius: "var(--radius-sm)",
            background: "transparent",
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "Aanmaken..." : "Betaallink"}
        </button>
      )}
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
