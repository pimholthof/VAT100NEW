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
  deleteInvoice,
  generateShareToken,
  createCreditNote,
  duplicateInvoice,
} from "@/features/invoices/actions";
import { InvoiceForm } from "@/features/invoices/components/InvoiceForm";
import { InvoiceLivePreview } from "@/features/invoices/components/InvoiceLivePreview";
import type { InvoiceStatus, VatRate } from "@/lib/types";
import {
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
  ConfirmDialog,
  useToast,
} from "@/components/ui";
import { STATUS_LABELS } from "@/lib/constants/status";
import { formatCurrency } from "@/lib/format";

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        vatScheme: inv.vat_scheme ?? "standard",
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
    const previousStatus = result?.data?.status as InvoiceStatus | undefined;
    setStatusUpdating(true);
    setStatusMsg(null);
    const res = await updateInvoiceStatus(params.id, newStatus);
    if (res.error) {
      toast(res.error, "error");
      setStatusMsg(res.error);
    } else {
      queryClient.invalidateQueries({ queryKey: ["invoice", params.id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      const canUndo = previousStatus && previousStatus !== newStatus;
      toast(`Status: ${STATUS_LABELS[newStatus]}`, {
        type: "success",
        action: canUndo
          ? {
              label: "Ongedaan",
              onClick: async () => {
                const undoRes = await updateInvoiceStatus(
                  params.id,
                  previousStatus
                );
                if (undoRes.error) {
                  toast(undoRes.error, "error");
                } else {
                  toast(`Teruggezet naar ${STATUS_LABELS[previousStatus]}`);
                  queryClient.invalidateQueries({
                    queryKey: ["invoice", params.id],
                  });
                  queryClient.invalidateQueries({ queryKey: ["invoices"] });
                }
              },
            }
          : undefined,
      });
    }
    setStatusUpdating(false);
  };

  const handleSendEmail = async () => {
    setEmailSending(true);
    setStatusMsg(null);
    const res = await sendInvoice(params.id);
    if (res.error) {
      toast(res.error, "error");
      setStatusMsg(res.error);
    } else {
      toast(`Verstuurd naar ${result?.data?.client?.email}`);
      queryClient.invalidateQueries({ queryKey: ["invoice", params.id] });
    }
    setEmailSending(false);
  };

  const handleSendReminder = async () => {
    setReminderSending(true);
    setStatusMsg(null);
    const res = await sendReminder(params.id);
    if (res.error) {
      toast(res.error, "error");
      setStatusMsg(res.error);
    } else {
      toast("Herinnering verstuurd");
    }
    setReminderSending(false);
  };

  const shareToken = localShareToken ?? serverShareToken;

  const handleGenerateShareLink = async () => {
    setShareLoading(true);
    const res = await generateShareToken(params.id);
    if (res.error) {
      toast(res.error, "error");
      setStatusMsg(res.error);
    } else if (res.data) {
      setLocalShareToken(res.data);
      toast("Deellink aangemaakt");
    }
    setShareLoading(false);
  };

  const handleCopyShareLink = async () => {
    if (!shareToken) return;
    const url = `${window.location.origin}/invoice/${shareToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast("Gekopieerd");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateCreditNote = async () => {
    setShowCreditNoteConfirm(false);
    setCreditNoteLoading(true);
    setStatusMsg(null);
    const res = await createCreditNote(params.id);
    if (res.error) {
      toast(res.error, "error");
      setStatusMsg(res.error);
    } else if (res.data) {
      toast("Creditnota aangemaakt");
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Primary flow: status transition + email send/remind */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {currentStatus === "draft" && (
              <ButtonPrimary
                onClick={() => handleStatusChange("sent")}
                loading={statusUpdating}
              >
                Markeer als verzonden
              </ButtonPrimary>
            )}
            {currentStatus === "sent" && (
              <>
                <ButtonPrimary
                  onClick={() => handleStatusChange("paid")}
                  loading={statusUpdating}
                >
                  Markeer als betaald
                </ButtonPrimary>
                <ButtonSecondary
                  onClick={() => handleStatusChange("overdue")}
                  loading={statusUpdating}
                >
                  Markeer als verlopen
                </ButtonSecondary>
              </>
            )}
            {currentStatus === "overdue" && (
              <ButtonPrimary
                onClick={() => handleStatusChange("paid")}
                loading={statusUpdating}
              >
                Markeer als betaald
              </ButtonPrimary>
            )}
            {currentStatus === "paid" && (
              <span
                style={{
                  fontSize: 11,
                  opacity: 0.45,
                  fontStyle: "italic",
                  padding: "8px 4px",
                }}
              >
                Betaald — niet meer te wijzigen
              </span>
            )}
            {currentStatus === "overdue" && result?.data?.client?.email && (
              <ButtonSecondary
                onClick={handleSendReminder}
                loading={reminderSending}
              >
                Stuur herinnering
              </ButtonSecondary>
            )}
            {(currentStatus === "sent" || currentStatus === "paid") &&
              result?.data?.client?.email && (
                <ButtonPrimary
                  onClick={handleSendEmail}
                  loading={emailSending}
                >
                  Verstuur per e-mail
                </ButtonPrimary>
              )}
          </div>

          {/* Utility actions: visually separated, quieter */}
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              alignItems: "center",
              paddingLeft: 8,
              borderLeft: "0.5px solid rgba(0,0,0,0.08)",
            }}
          >
            {currentStatus !== "draft" && !result?.data?.is_credit_note && (
              <ButtonSecondary
                onClick={() => setShowCreditNoteConfirm(true)}
                loading={creditNoteLoading}
              >
                Creditnota
              </ButtonSecondary>
            )}
            <ButtonSecondary
              onClick={async () => {
                setDuplicating(true);
                const res = await duplicateInvoice(params.id);
                if (res.error) {
                  toast(res.error, "error");
                  setStatusMsg(res.error);
                } else if (res.data) {
                  toast("Factuur gedupliceerd");
                  router.push(`/dashboard/invoices/${res.data}`);
                }
                setDuplicating(false);
              }}
              loading={duplicating}
            >
              Dupliceer
            </ButtonSecondary>
            {currentStatus === "draft" && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
                aria-busy={deleting || undefined}
                style={{
                  background: "none",
                  border: "none",
                  cursor: deleting ? "not-allowed" : "pointer",
                  fontSize: "var(--text-label)",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  opacity: 0.35,
                  padding: "8px 4px",
                  color: "var(--color-accent)",
                }}
              >
                {deleting ? "..." : "Verwijder"}
              </button>
            )}
          </div>
        </div>
      </div>
      {statusMsg && (
        <ErrorMessage style={{ marginBottom: 24 }}>{statusMsg}</ErrorMessage>
      )}
      {/* Share link — compact single-row */}
      <div
        style={{
          borderBottom: "0.5px solid rgba(13,13,11,0.15)",
          padding: "12px 0",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "var(--text-label)",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.4,
            flexShrink: 0,
          }}
        >
          Deellink
        </span>
        {shareToken ? (
          <>
            <span
              title={
                typeof window !== "undefined"
                  ? `${window.location.origin}/invoice/${shareToken}`
                  : undefined
              }
              style={{
                fontSize: "var(--text-body-sm)",
                fontFamily: "var(--font-mono)",
                fontWeight: 300,
                opacity: 0.55,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {typeof window !== "undefined"
                ? `${window.location.origin}/invoice/${shareToken}`
                : `/invoice/${shareToken}`}
            </span>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <ButtonSecondary onClick={handleCopyShareLink}>
                {copied ? "Gekopieerd" : "Kopieer"}
              </ButtonSecondary>
              <a
                href={`/invoice/${shareToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                aria-label="Open deellink in nieuw tabblad"
              >
                Open
              </a>
            </div>
          </>
        ) : (
          <ButtonSecondary
            onClick={handleGenerateShareLink}
            loading={shareLoading}
          >
            Genereer deellink
          </ButtonSecondary>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        {currentStatus === "draft" ? (
          <div className="invoice-edit-layout">
            <div className="invoice-edit-layout__form">
              <InvoiceForm invoiceId={params.id} />
            </div>
            <aside
              className="invoice-edit-layout__preview"
              aria-label="Live factuurvoorbeeld"
            >
              <InvoiceLivePreview
                invoiceId={params.id}
                isCreditNote={result?.data?.is_credit_note ?? false}
              />
            </aside>
          </div>
        ) : (
          <p style={{ opacity: 0.3, fontSize: "var(--text-body-sm)", padding: "24px 0", fontStyle: "italic" }}>
            Deze factuur is verzonden en kan niet meer worden bewerkt.
          </p>
        )}
      </div>

      <ConfirmDialog
        open={showCreditNoteConfirm}
        title="Creditnota aanmaken"
        message="Dit genereert een nieuwe factuur met negatieve bedragen, gekoppeld aan de huidige. Je BTW-aangifte corrigeert automatisch bij het volgende kwartaal."
        confirmLabel="Creditnota aanmaken"
        onConfirm={handleCreateCreditNote}
        onCancel={() => setShowCreditNoteConfirm(false)}
      >
        {result?.data && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "rgba(0,0,0,0.03)",
              borderRadius: "var(--radius-sm)",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              columnGap: 20,
              rowGap: 6,
              fontSize: 12,
            }}
          >
            <span style={{ opacity: 0.5 }}>Originele factuur</span>
            <span className="mono-amount">{result.data.invoice_number}</span>
            <span style={{ opacity: 0.5 }}>Klant</span>
            <span>{result.data.client?.name ?? "—"}</span>
            <span style={{ opacity: 0.5 }}>Bedrag</span>
            <span className="mono-amount">
              −{formatCurrency(Number(result.data.total_inc_vat) || 0)}
            </span>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Factuur verwijderen"
        message="Deze conceptfactuur wordt permanent verwijderd. Dit kan niet ongedaan worden gemaakt."
        confirmLabel="Verwijderen"
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          setDeleting(true);
          const res = await deleteInvoice(params.id);
          if (res.error) {
            toast(res.error, "error");
            setStatusMsg(res.error);
            setDeleting(false);
          } else {
            toast("Factuur verwijderd");
            router.push("/dashboard/invoices");
          }
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      >
        {result?.data && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              background: "rgba(165, 28, 48, 0.04)",
              borderLeft: "2px solid var(--color-accent)",
              borderRadius: "0 var(--radius-sm) var(--radius-sm) 0",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              columnGap: 20,
              rowGap: 6,
              fontSize: 12,
            }}
          >
            <span style={{ opacity: 0.5 }}>Factuur</span>
            <span className="mono-amount">{result.data.invoice_number}</span>
            <span style={{ opacity: 0.5 }}>Klant</span>
            <span>{result.data.client?.name ?? "—"}</span>
            <span style={{ opacity: 0.5 }}>Bedrag</span>
            <span className="mono-amount">
              {formatCurrency(Number(result.data.total_inc_vat) || 0)}
            </span>
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
