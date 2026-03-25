"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  getInvoice,
  updateInvoiceStatus,
  sendInvoice,
  sendReminder,
  generateShareToken,
  createCreditNote,
  duplicateInvoice,
} from "@/features/invoices/actions";
import { InvoiceForm } from "@/features/invoices/components/InvoiceForm";
import type { InvoiceStatus, VatRate } from "@/lib/types";
import {
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
  ConfirmDialog,
} from "@/components/ui";
import { STATUS_LABELS } from "@/lib/constants/status";

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const loadInvoice = useInvoiceStore((s) => s.loadInvoice);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
  const [localShareToken, setLocalShareToken] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creditNoteLoading, setCreditNoteLoading] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showCreditNoteConfirm, setShowCreditNoteConfirm] = useState(false);

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
      setStatusMsg(`Status gewijzigd naar ${STATUS_LABELS[newStatus]}.`);
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

  const handleSendReminder = async () => {
    setReminderSending(true);
    setStatusMsg(null);
    const res = await sendReminder(params.id);
    if (res.error) {
      setStatusMsg(res.error);
    } else {
      setStatusMsg("Herinnering verstuurd.");
    }
    setReminderSending(false);
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

  const handleCreateCreditNote = async () => {
    setShowCreditNoteConfirm(false);
    setCreditNoteLoading(true);
    setStatusMsg(null);
    const res = await createCreditNote(params.id);
    if (res.error) {
      setStatusMsg(res.error);
    } else if (res.data) {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      router.push(`/dashboard/invoices/${res.data}`);
    }
    setCreditNoteLoading(false);
  };

  if (isLoading) {
    return (
      <div style={{ padding: "64px 0" }}>
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 32 }} />
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ marginBottom: 20 }}>
            <div className="skeleton" style={{ width: 80, height: 9, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: "100%", height: 36 }} />
          </div>
        ))}
      </div>
    );
  }

  if (result?.error) {
    return (
      <ErrorMessage>
        Fout: {result.error}
      </ErrorMessage>
    );
  }

  const currentStatus = result?.data?.status;

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-lg)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 0.9,
          margin: "0 0 32px",
        }}
      >
        Factuur{" "}
        <span style={{ fontSize: "var(--text-display-md)" }}>
          {result?.data?.invoice_number}
        </span>
      </h1>

      {/* Status bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "0.5px solid rgba(13,13,11,0.15)",
          borderBottom: "0.5px solid rgba(13,13,11,0.15)",
          padding: "16px 0",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {STATUS_LABELS[currentStatus ?? ""] ?? currentStatus}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {currentStatus === "draft" && (
            <ButtonPrimary
              onClick={() => handleStatusChange("sent")}
              disabled={statusUpdating}
            >
              Markeer als verzonden
            </ButtonPrimary>
          )}
          {currentStatus === "sent" && (
            <>
              <ButtonPrimary
                onClick={() => handleStatusChange("paid")}
                disabled={statusUpdating}
              >
                Markeer als betaald
              </ButtonPrimary>
              <ButtonSecondary
                onClick={() => handleStatusChange("overdue")}
                disabled={statusUpdating}
              >
                Markeer als verlopen
              </ButtonSecondary>
            </>
          )}
          {(currentStatus === "paid" || currentStatus === "overdue") && (
            <ButtonSecondary
              onClick={() => handleStatusChange("draft")}
              disabled={statusUpdating}
            >
              Terug naar concept
            </ButtonSecondary>
          )}
          {currentStatus === "overdue" && result?.data?.client?.email && (
            <ButtonSecondary
              onClick={handleSendReminder}
              disabled={reminderSending}
            >
              {reminderSending ? "Verzenden..." : "Stuur herinnering"}
            </ButtonSecondary>
          )}
          {(currentStatus === "sent" || currentStatus === "paid") &&
            result?.data?.client?.email && (
              <ButtonPrimary
                onClick={handleSendEmail}
                disabled={emailSending}
              >
                {emailSending ? "Verzenden..." : "Verstuur per e-mail"}
              </ButtonPrimary>
            )}
          {currentStatus !== "draft" && !result?.data?.is_credit_note && (
            <ButtonSecondary
              onClick={() => setShowCreditNoteConfirm(true)}
              disabled={creditNoteLoading}
            >
              {creditNoteLoading ? "Aanmaken..." : "Creditnota aanmaken"}
            </ButtonSecondary>
          )}
          <ButtonSecondary
            onClick={async () => {
              setDuplicating(true);
              const res = await duplicateInvoice(params.id);
              if (res.error) {
                setStatusMsg(res.error);
              } else if (res.data) {
                router.push(`/dashboard/invoices/${res.data}`);
              }
              setDuplicating(false);
            }}
            disabled={duplicating}
          >
            {duplicating ? "Dupliceren..." : "Dupliceer factuur"}
          </ButtonSecondary>
        </div>
      </div>
      {statusMsg && (
        <ErrorMessage style={{ marginBottom: 24 }}>{statusMsg}</ErrorMessage>
      )}
      {/* Share link section */}
      <div
        style={{
          borderBottom: "0.5px solid rgba(13,13,11,0.15)",
          padding: "16px 0",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: 8,
            opacity: 0.4,
          }}
        >
          Deel link
        </div>
        {shareToken ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: "var(--text-mono-md)",
                fontWeight: 300,
                opacity: 0.6,
                wordBreak: "break-all",
                flex: 1,
              }}
            >
              {typeof window !== "undefined"
                ? `${window.location.origin}/invoice/${shareToken}`
                : `/invoice/${shareToken}`}
            </span>
            <ButtonSecondary onClick={handleCopyShareLink}>
              {copied ? "Gekopieerd" : "Kopieer"}
            </ButtonSecondary>
          </div>
        ) : (
          <ButtonSecondary
            onClick={handleGenerateShareLink}
            disabled={shareLoading}
          >
            {shareLoading ? "Genereren..." : "Genereer deellink"}
          </ButtonSecondary>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <InvoiceForm invoiceId={params.id} />
      </div>

      <ConfirmDialog
        open={showCreditNoteConfirm}
        title="Creditnota aanmaken"
        message="Weet je zeker dat je een creditnota wilt aanmaken voor deze factuur? Dit maakt een nieuwe negatieve factuur aan."
        confirmLabel="Creditnota aanmaken"
        onConfirm={handleCreateCreditNote}
        onCancel={() => setShowCreditNoteConfirm(false)}
      />
    </div>
  );
}
