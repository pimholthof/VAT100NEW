"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  getInvoice,
  updateInvoiceStatus,
  sendInvoice,
  sendReminder,
  generateShareToken,
} from "@/lib/actions/invoices";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import type { InvoiceStatus, VatRate } from "@/lib/types";
import {
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
} from "@/components/ui";
import { STATUS_LABELS } from "@/lib/constants/status";

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const loadInvoice = useInvoiceStore((s) => s.loadInvoice);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [reminderSending, setReminderSending] = useState(false);
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
          vat_rate: (l.vat_rate ?? inv.vat_rate) as VatRate,
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

  if (isLoading) {
    return (
      <div className="py-16">
        <div className="skeleton w-[200px] h-[32px] mb-8" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="mb-5">
            <div className="skeleton w-[80px] h-[9px] mb-2" />
            <div className="skeleton w-full h-[36px]" />
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
      <h1 className="font-[family-name:var(--font-display)] text-[var(--text-display-lg)] font-bold tracking-[var(--tracking-display)] leading-[0.9] mb-8">
        Factuur{" "}
        <span className="font-mono text-[var(--text-display-md)]">
          {result?.data?.invoice_number}
        </span>
      </h1>

      {/* Status bar */}
      <div className="flex justify-between items-center border-t border-b border-foreground/15 py-4 mb-2">
        <span className="text-[var(--text-label)] font-medium tracking-[0.08em] uppercase">
          {STATUS_LABELS[currentStatus ?? ""] ?? currentStatus}
        </span>
        <div className="flex gap-2">
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
        </div>
      </div>
      {statusMsg && (
        <ErrorMessage className="mb-6">{statusMsg}</ErrorMessage>
      )}
      {/* Share link section */}
      <div className="border-b border-foreground/15 py-4 mb-2">
        <div className="text-[var(--text-label)] font-medium tracking-[0.08em] uppercase mb-2 opacity-40">
          Deel link
        </div>
        {shareToken ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[var(--text-mono-md)] font-light opacity-60 break-all flex-1">
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

      <div className="mt-6">
        <InvoiceForm invoiceId={params.id} />
      </div>
    </div>
  );
}
