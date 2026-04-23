"use client";

import { useEffect, useMemo, useRef, useCallback, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/lib/i18n/context";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  createInvoice,
  updateInvoice,
  generateInvoiceNumber,
} from "@/features/invoices/actions";
import { getClients } from "@/features/clients/actions";
import { detectVatScheme } from "@/lib/tax/vat-scheme-detector";
import { InvoiceMetadata } from "./InvoiceMetadata";
import { InvoiceTotals } from "./InvoiceTotals";
import { ErrorMessage } from "@/components/ui";
import { m as motion  } from "framer-motion";
import { InvoiceRecipientSection } from "./InvoiceRecipientSection";
import { InvoiceLinesSection } from "./InvoiceLinesSection";
import { InvoiceFormActions } from "./InvoiceFormActions";
import { MobileInvoiceWizard } from "./MobileInvoiceWizard";

interface InvoiceFormProps {
  invoiceId?: string;
}

function useIsMobile(breakpoint = 768) {
  const subscribe = useCallback((cb: () => void) => {
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    mql.addEventListener("change", cb);
    return () => mql.removeEventListener("change", cb);
  }, [breakpoint]);
  const getSnapshot = useCallback(
    () => window.matchMedia(`(max-width: ${breakpoint}px)`).matches,
    [breakpoint]
  );
  const getServerSnapshot = useCallback(() => false, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function InvoiceForm({ invoiceId }: InvoiceFormProps) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileInvoiceWizard invoiceId={invoiceId} />;
  return <DesktopInvoiceForm invoiceId={invoiceId} />;
}

function DesktopInvoiceForm({ invoiceId }: InvoiceFormProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clientId = useInvoiceStore((s) => s.clientId);
  const setClientId = useInvoiceStore((s) => s.setClientId);
  const invoiceNumber = useInvoiceStore((s) => s.invoiceNumber);
  const setInvoiceNumber = useInvoiceStore((s) => s.setInvoiceNumber);
  const lines = useInvoiceStore((s) => s.lines);
  const addLine = useInvoiceStore((s) => s.addLine);
  const updateLine = useInvoiceStore((s) => s.updateLine);
  const removeLine = useInvoiceStore((s) => s.removeLine);
  const lastSavedAt = useInvoiceStore((s) => s.lastSavedAt);
  const markSaved = useInvoiceStore((s) => s.markSaved);
  const toInput = useInvoiceStore((s) => s.toInput);
  const setVatScheme = useInvoiceStore((s) => s.setVatScheme);
  const setVatRate = useInvoiceStore((s) => s.setVatRate);
  const setDueDate = useInvoiceStore((s) => s.setDueDate);
  const [vatReason, setVatReason] = useState<string | null>(null);

  const { data: clientsResult, isLoading: clientsLoading, isError: clientsError } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });
  // Stabilise reference so useEffect deps don't fire on unrelated re-renders.
  const clients = useMemo(() => clientsResult?.data ?? [], [clientsResult?.data]);
  const hasClientError = clientsError || !!clientsResult?.error;
  const clientErrorMessage = clientsResult?.error || t.errors.generic;

  // Auto-detect VAT scheme when client changes
  const applyClientVatScheme = useCallback((cId: string | null, clientList: typeof clients) => {
    if (!cId) {
      setVatReason(null);
      return;
    }
    const client = clientList.find((c) => c.id === cId);
    if (!client) return;

    const detection = detectVatScheme(client);
    setVatScheme(detection.scheme);
    setVatRate(detection.rate as 0 | 9 | 21);
    setVatReason(detection.reason);

    // Set due date based on client payment terms
    const termDays = client.payment_terms_days ?? 30;
    const due = new Date();
    due.setDate(due.getDate() + termDays);
    setDueDate(due.toISOString().split("T")[0]);
  }, [setVatScheme, setVatRate, setDueDate]);

  useEffect(() => {
    Promise.resolve().then(() => applyClientVatScheme(clientId, clients));
  }, [clientId, clients, applyClientVatScheme]);

  // Generate invoice number for new invoices
  useEffect(() => {
    if (!invoiceId && !invoiceNumber) {
      generateInvoiceNumber().then((result) => {
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setInvoiceNumber(result.data);
        }
      });
    }
  }, [invoiceId, invoiceNumber, setInvoiceNumber]);

  // Auto-save draft every 30 seconds
  const handleAutoSave = useCallback(async () => {
    const s = useInvoiceStore.getState();
    if (!s.isDirty || !s.clientId || !s.invoiceNumber) return;

    if (invoiceId) {
      await updateInvoice(invoiceId, s.toInput("draft"));
    } else {
      return;
    }
    useInvoiceStore.getState().markSaved();
  }, [invoiceId]);

  useEffect(() => {
    autoSaveRef.current = setInterval(handleAutoSave, 30_000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [handleAutoSave]);

  const handleSave = async (andPreview: boolean) => {
    if (!clientId) {
      setError(t.invoices.selectClient);
      return;
    }
    if (!invoiceNumber) {
      setError(t.invoices.invoiceNumberRequired);
      return;
    }

    setSaving(true);
    setError(null);

    const status = andPreview ? "sent" : "draft";
    const input = toInput(status as "draft" | "sent");

    let result;
    if (invoiceId) {
      result = await updateInvoice(invoiceId, input);
      if (!result.error) {
        markSaved();
        if (andPreview) {
          router.push(`/dashboard/invoices/${invoiceId}/preview`);
        }
      }
    } else {
      result = await createInvoice(input);
      if (!result.error && result.data) {
        markSaved();
        if (andPreview) {
          router.push(`/dashboard/invoices/${result.data}/preview`);
        } else {
          router.push(`/dashboard/invoices/${result.data}`);
        }
      }
    }

    if (result.error) {
      setError(result.error);
    }
    setSaving(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      style={{ maxWidth: "100%" }}
    >
      {error && (
        <ErrorMessage style={{ marginBottom: 40 }}>{error}</ErrorMessage>
      )}

      {/* ── Recipient: Large and focused ── */}
      <InvoiceRecipientSection
        clientId={clientId}
        setClientId={setClientId}
        clients={clients}
        clientsLoading={clientsLoading}
        hasClientError={hasClientError}
        clientErrorMessage={clientErrorMessage}
        showNewClient={showNewClient}
        setShowNewClient={setShowNewClient}
      />

      {/* ── The Sum: Invoicing as Expression ── */}
      <InvoiceLinesSection
        lines={lines}
        addLine={addLine}
        updateLine={updateLine}
        removeLine={removeLine}
      />

      {/* ── VAT auto-detection feedback ── */}
      {vatReason && (
        <div
          style={{
            padding: "12px 0",
            marginBottom: 16,
            fontSize: "var(--text-body-sm)",
            opacity: 0.5,
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          {vatReason}
        </div>
      )}

      {/* ── Metadata: Precision lines ── */}
      <InvoiceMetadata defaultCollapsed={!!invoiceId} />

      {/* ── The Monolith: Total ── */}
      <InvoiceTotals />

      {/* ── Actions: The VanMoof Unlock ── */}
      <InvoiceFormActions
        saving={saving}
        onSaveDraft={() => handleSave(false)}
        onIssueAndPreview={() => handleSave(true)}
        recipientName={clients.find((c) => c.id === clientId)?.name ?? null}
      />

      {lastSavedAt && (
        <p className="mono-amount" style={{ fontSize: 10, opacity: 0.2, marginTop: 40, textAlign: "center" }}>
          {t.invoices.lastSavedAt} {new Date(lastSavedAt).toLocaleTimeString("nl-NL")}
        </p>
      )}
    </motion.div>
  );
}


