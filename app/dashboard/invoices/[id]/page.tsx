"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  getInvoice,
  updateInvoiceStatus,
  sendInvoice,
  generateShareToken,
} from "@/lib/actions/invoices";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import type { InvoiceStatus, VatRate } from "@/lib/types";

const statusLabels: Record<string, string> = {
  draft: "Concept",
  sent: "Verzonden",
  paid: "Betaald",
  overdue: "Verlopen",
};

const buttonPrimaryStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-lg)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  padding: "12px 20px",
  border: "none",
  background: "var(--foreground)",
  color: "var(--background)",
  cursor: "pointer",
};

const buttonSecondaryStyle: React.CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: "var(--text-body-md)",
  fontWeight: 500,
  letterSpacing: "0.05em",
  padding: "10px 16px",
  border: "1px solid rgba(13, 13, 11, 0.2)",
  background: "transparent",
  color: "var(--foreground)",
  cursor: "pointer",
};

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const loadInvoice = useInvoiceStore((s) => s.loadInvoice);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [localShareToken, setLocalShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: result, isLoading } = useQuery({
    queryKey: ["invoice", params.id],
    queryFn: () => getInvoice(params.id),
  });

  const serverShareToken = result?.data?.share_token ?? null;

  useEffect(() => {
    if (result?.data) {
      const inv = result.data;
      loadInvoice({
        clientId: inv.client_id,
        invoiceNumber: inv.invoice_number,
        issueDate: inv.issue_date,
        dueDate: inv.due_date ?? "",
        vatRate: inv.vat_rate as VatRate,
        notes: inv.notes ?? "",
        lines: inv.lines.map((l) => ({
          id: l.id,
          description: l.description,
          quantity: l.quantity,
          unit: l.unit,
          rate: l.rate,
        })),
      });
    }
  }, [result?.data, loadInvoice]);

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    setStatusUpdating(true);
    setStatusMsg(null);
    const res = await updateInvoiceStatus(params.id, newStatus);
    if (res.error) {
      setStatusMsg(res.error);
    } else {
      setStatusMsg(`Status gewijzigd naar ${statusLabels[newStatus]}.`);
      queryClient.invalidateQueries({ queryKey: ["invoice", params.id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    }
    setStatusUpdating(false);
  };

  const handleSendEmail = async () => {
    setEmailSending(true);
    setStatusMsg(null);
    const res = await sendInvoice(params.id);
    if (res.error) {
      setStatusMsg(res.error);
    } else {
      setStatusMsg(
        `Factuur verstuurd naar ${result?.data?.client?.email}.`
      );
      queryClient.invalidateQueries({ queryKey: ["invoice", params.id] });
    }
    setEmailSending(false);
  };

  const shareToken = localShareToken ?? serverShareToken;

  const handleGenerateShareLink = async () => {
    setShareLoading(true);
    const res = await generateShareToken(params.id);
    if (res.error) {
      setStatusMsg(res.error);
    } else if (res.data) {
      setLocalShareToken(res.data);
    }
    setShareLoading(false);
  };

  const handleCopyShareLink = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/invoice/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-lg)",
          fontWeight: 300,
        }}
      >
        Laden...
      </p>
    );
  }

  if (result?.error) {
    return (
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-lg)",
          fontWeight: 400,
        }}
      >
        Fout: {result.error}
      </p>
    );
  }

  const currentStatus = result?.data?.status;

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-lg)",
          fontWeight: 900,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 1,
          margin: "0 0 32px",
        }}
      >
        Factuur {result?.data?.invoice_number}
      </h1>

      {/* Status bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "none",
          borderTop: "var(--border-rule)",
          borderBottom: "var(--border-rule)",
          padding: "16px 0",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.02em",
            padding: "4px 0",
            border: "none",
            display: "inline-block",
          }}
        >
          {statusLabels[currentStatus ?? ""] ?? currentStatus}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {currentStatus === "draft" && (
            <button
              type="button"
              onClick={() => handleStatusChange("sent")}
              disabled={statusUpdating}
              style={buttonPrimaryStyle}
            >
              Markeer als verzonden
            </button>
          )}
          {currentStatus === "sent" && (
            <>
              <button
                type="button"
                onClick={() => handleStatusChange("paid")}
                disabled={statusUpdating}
                style={buttonPrimaryStyle}
              >
                Markeer als betaald
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("overdue")}
                disabled={statusUpdating}
                style={buttonSecondaryStyle}
              >
                Markeer als verlopen
              </button>
            </>
          )}
          {(currentStatus === "paid" || currentStatus === "overdue") && (
            <button
              type="button"
              onClick={() => handleStatusChange("draft")}
              disabled={statusUpdating}
              style={buttonSecondaryStyle}
            >
              Terug naar concept
            </button>
          )}
          {(currentStatus === "sent" || currentStatus === "paid") &&
            result?.data?.client?.email && (
              <button
                type="button"
                onClick={handleSendEmail}
                disabled={emailSending}
                style={buttonPrimaryStyle}
              >
                {emailSending ? "Verzenden..." : "Verstuur per e-mail"}
              </button>
            )}
        </div>
      </div>
      {statusMsg && (
        <div
          style={{
            padding: "12px 16px",
            border: "none",
            borderLeft: "2px solid var(--foreground)",
            marginBottom: 24,
            fontFamily: "var(--font-body), sans-serif",
            fontSize: "var(--text-body-md)",
            fontWeight: 400,
          }}
        >
          {statusMsg}
        </div>
      )}
      {/* Share link section */}
      <div
        style={{
          borderBottom: "var(--border-rule)",
          padding: "16px 0",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 500,
            letterSpacing: "0.02em",
            marginBottom: 8,
          }}
        >
          Deel link
        </div>
        {shareToken ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontFamily: "var(--font-body), sans-serif",
                fontSize: "var(--text-body-md)",
                fontWeight: 300,
                color: "rgba(13,13,11,0.6)",
                wordBreak: "break-all",
                flex: 1,
              }}
            >
              {typeof window !== "undefined"
                ? `${window.location.origin}/invoice/${shareToken}`
                : `/invoice/${shareToken}`}
            </span>
            <button
              type="button"
              onClick={handleCopyShareLink}
              style={buttonSecondaryStyle}
            >
              {copied ? "Gekopieerd" : "Kopieer"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGenerateShareLink}
            disabled={shareLoading}
            style={buttonSecondaryStyle}
          >
            {shareLoading ? "Genereren..." : "Genereer deellink"}
          </button>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <InvoiceForm invoiceId={params.id} />
      </div>
    </div>
  );
}
