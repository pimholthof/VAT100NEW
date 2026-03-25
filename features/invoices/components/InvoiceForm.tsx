"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  createInvoice,
  updateInvoice,
  generateInvoiceNumber,
} from "@/features/invoices/actions";
import { getClients } from "@/features/clients/actions";
import { InvoiceMetadata } from "./InvoiceMetadata";
import { InvoiceTotals } from "./InvoiceTotals";
import { ErrorMessage } from "@/components/ui";
import { m as motion  } from "framer-motion";
import { InvoiceRecipientSection } from "./InvoiceRecipientSection";
import { InvoiceLinesSection } from "./InvoiceLinesSection";
import { InvoiceFormActions } from "./InvoiceFormActions";

interface InvoiceFormProps {
  invoiceId?: string;
}

export function InvoiceForm({ invoiceId }: InvoiceFormProps) {
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

  const { data: clientsResult, isLoading: clientsLoading, isError: clientsError } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });
  const clients = clientsResult?.data ?? [];
  const hasClientError = clientsError || !!clientsResult?.error;
  const clientErrorMessage = clientsResult?.error || "Fout bij ophalen";

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
      setError("Selecteer een klant.");
      return;
    }
    if (!invoiceNumber) {
      setError("Factuurnummer is verplicht.");
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
      style={{ maxWidth: 900, margin: "0 auto" }}
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

      {/* ── Metadata: Precision lines ── */}
      <InvoiceMetadata />

      {/* ── The Monolith: Total ── */}
      <InvoiceTotals />

      {/* ── Actions: The VanMoof Unlock ── */}
      <InvoiceFormActions
        saving={saving}
        onSaveDraft={() => handleSave(false)}
        onIssueAndPreview={() => handleSave(true)}
      />

      {lastSavedAt && (
        <p className="mono-amount" style={{ fontSize: 10, opacity: 0.2, marginTop: 40, textAlign: "center" }}>
          PROTOCOL Sync / {new Date(lastSavedAt).toLocaleTimeString("nl-NL")}
        </p>
      )}
    </motion.div>
  );
}


