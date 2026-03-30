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

  const handleOpen = () => {
    if (!link) return;
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleRefresh = async () => {
    setLink(null);
    await handleCreate();
  };

  const buttonBase: React.CSSProperties = {
    fontSize: "var(--text-body-md)",
    fontWeight: 500,
    letterSpacing: "0.05em",
    padding: "8px 20px",
    cursor: "pointer",
  };

  const primaryButton: React.CSSProperties = {
    ...buttonBase,
    color: "#A51C30",
    border: "1px solid #A51C30",
    background: "transparent",
  };

  const secondaryButton: React.CSSProperties = {
    ...buttonBase,
    color: "var(--foreground)",
    border: "0.5px solid rgba(13,13,11,0.2)",
    background: "transparent",
    opacity: 0.6,
    fontSize: "var(--text-body-sm)",
  };

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      {link ? (
        <>
          <button type="button" onClick={handleCopy} style={primaryButton}>
            Kopieer betaallink
          </button>
          <button type="button" onClick={handleOpen} style={secondaryButton}>
            Openen
          </button>
          <button type="button" onClick={handleRefresh} disabled={loading} style={{ ...secondaryButton, opacity: loading ? 0.3 : 0.6 }}>
            {loading ? "Bezig..." : "Vernieuw link"}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleCreate}
          disabled={loading}
          aria-busy={loading}
          style={{
            ...primaryButton,
            cursor: loading ? "default" : "pointer",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "Aanmaken..." : "Betaallink aanmaken"}
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
