"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { m as motion, AnimatePresence } from "framer-motion";

import { useLocale } from "@/lib/i18n/context";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  createInvoice,
  updateInvoice,
  generateInvoiceNumber,
} from "@/features/invoices/actions";
import { getClients } from "@/features/clients/actions";
import { detectVatScheme } from "@/lib/tax/vat-scheme-detector";
import { InvoiceRecipientSection } from "./InvoiceRecipientSection";
import { InvoiceLinesSection } from "./InvoiceLinesSection";
import { InvoiceMetadata } from "./InvoiceMetadata";
import { InvoiceTotals } from "./InvoiceTotals";
import { InvoiceLivePreview } from "./InvoiceLivePreview";
import { ErrorMessage, StepIndicator } from "@/components/ui";
import { playSound } from "@/lib/utils/sound";

interface MobileInvoiceWizardProps {
  invoiceId?: string;
}

type Step = 1 | 2 | 3;

export function MobileInvoiceWizard({ invoiceId }: MobileInvoiceWizardProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [vatReason, setVatReason] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clientId = useInvoiceStore((s) => s.clientId);
  const setClientId = useInvoiceStore((s) => s.setClientId);
  const invoiceNumber = useInvoiceStore((s) => s.invoiceNumber);
  const setInvoiceNumber = useInvoiceStore((s) => s.setInvoiceNumber);
  const lines = useInvoiceStore((s) => s.lines);
  const addLine = useInvoiceStore((s) => s.addLine);
  const updateLine = useInvoiceStore((s) => s.updateLine);
  const removeLine = useInvoiceStore((s) => s.removeLine);
  const markSaved = useInvoiceStore((s) => s.markSaved);
  const toInput = useInvoiceStore((s) => s.toInput);
  const setVatScheme = useInvoiceStore((s) => s.setVatScheme);
  const setVatRate = useInvoiceStore((s) => s.setVatRate);
  const setDueDate = useInvoiceStore((s) => s.setDueDate);

  const { data: clientsResult, isLoading: clientsLoading, isError: clientsError } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });
  // Stabilise reference so useEffect deps don't fire on unrelated re-renders.
  const clients = useMemo(() => clientsResult?.data ?? [], [clientsResult?.data]);
  const hasClientError = clientsError || !!clientsResult?.error;
  const clientErrorMessage = clientsResult?.error || t.errors.generic;

  const applyClientVatScheme = useCallback(
    (cId: string | null, clientList: typeof clients) => {
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
      const termDays = client.payment_terms_days ?? 30;
      const due = new Date();
      due.setDate(due.getDate() + termDays);
      setDueDate(due.toISOString().split("T")[0]);
    },
    [setVatScheme, setVatRate, setDueDate]
  );

  useEffect(() => {
    Promise.resolve().then(() => applyClientVatScheme(clientId, clients));
  }, [clientId, clients, applyClientVatScheme]);

  useEffect(() => {
    if (!invoiceId && !invoiceNumber) {
      generateInvoiceNumber().then((result) => {
        if (result.error) setError(result.error);
        else if (result.data) setInvoiceNumber(result.data);
      });
    }
  }, [invoiceId, invoiceNumber, setInvoiceNumber]);

  const handleAutoSave = useCallback(async () => {
    const s = useInvoiceStore.getState();
    if (!s.isDirty || !s.clientId || !s.invoiceNumber) return;
    if (invoiceId) {
      await updateInvoice(invoiceId, s.toInput("draft"));
      useInvoiceStore.getState().markSaved();
    }
  }, [invoiceId]);

  useEffect(() => {
    autoSaveRef.current = setInterval(handleAutoSave, 30_000);
    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [handleAutoSave]);

  async function handleSave(andPreview: boolean) {
    if (!clientId) {
      setError(t.invoices.selectClient);
      setStep(1);
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
        if (andPreview) router.push(`/dashboard/invoices/${invoiceId}/preview`);
      }
    } else {
      result = await createInvoice(input);
      if (!result.error && result.data) {
        markSaved();
        router.push(
          andPreview
            ? `/dashboard/invoices/${result.data}/preview`
            : `/dashboard/invoices/${result.data}`
        );
      }
    }

    if (result.error) setError(result.error);
    setSaving(false);
  }

  function goNext() {
    if (step === 1) {
      if (!clientId) {
        setError(t.invoices.selectClient);
        return;
      }
      setError(null);
      setStep(2);
    } else if (step === 2) {
      if (lines.length === 0 || lines.every((l) => !l.description && !l.rate)) {
        setError("Voeg minstens één factuurregel toe.");
        return;
      }
      setError(null);
      setStep(3);
    }
  }

  function goBack() {
    setError(null);
    if (step > 1) setStep((step - 1) as Step);
  }

  const stepLabels = ["Klant", "Regels", "Verstuur"];

  return (
    <div style={{ maxWidth: "100%", paddingBottom: 120 }}>
      <StepIndicator currentStep={step} totalSteps={3} labels={stepLabels} />

      {error && <ErrorMessage style={{ marginBottom: 20 }}>{error}</ErrorMessage>}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.section
            key="step-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
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
          </motion.section>
        )}

        {step === 2 && (
          <motion.section
            key="step-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <InvoiceLinesSection
              lines={lines}
              addLine={addLine}
              updateLine={updateLine}
              removeLine={removeLine}
            />
            {vatReason && (
              <div
                style={{
                  padding: "12px 0",
                  marginTop: 12,
                  fontSize: "var(--text-body-sm)",
                  opacity: 0.5,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                }}
              >
                {vatReason}
              </div>
            )}
          </motion.section>
        )}

        {step === 3 && (
          <motion.section
            key="step-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <InvoiceMetadata defaultCollapsed={false} />
            <div style={{ marginTop: 24 }}>
              <InvoiceTotals />
            </div>
            <button
              type="button"
              className="invoice-mobile-preview-toggle"
              onClick={() => setShowPreview((v) => !v)}
              aria-expanded={showPreview}
              aria-controls="mobile-invoice-preview"
            >
              {showPreview ? "Verberg voorbeeld" : "Toon voorbeeld"}
            </button>
            {showPreview && (
              <div
                id="mobile-invoice-preview"
                className="invoice-mobile-preview-wrapper"
              >
                <InvoiceLivePreview mode="inline" scale={0.52} />
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Sticky bottom wizard bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--background)",
          borderTop: "0.5px solid rgba(0,0,0,0.08)",
          padding: "12px 16px calc(12px + env(safe-area-inset-bottom))",
          display: "flex",
          gap: 10,
          zIndex: 800,
        }}
      >
        {step > 1 && (
          <button
            type="button"
            onClick={goBack}
            disabled={saving}
            style={{
              flex: 1,
              padding: "16px",
              background: "transparent",
              border: "0.5px solid rgba(0,0,0,0.12)",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Terug
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={saving}
            style={{
              flex: 2,
              padding: "16px",
              background: "var(--foreground)",
              color: "var(--background)",
              border: "none",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Volgende
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                handleSave(false);
                playSound("glass-ping");
              }}
              disabled={saving}
              style={{
                flex: 1,
                padding: "16px",
                background: "transparent",
                border: "0.5px solid rgba(0,0,0,0.12)",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {saving ? "..." : t.invoices.saveDraft}
            </button>
            <button
              type="button"
              onClick={() => {
                handleSave(true);
                playSound("glass-ping");
              }}
              disabled={saving}
              style={{
                flex: 2,
                padding: "16px",
                background: "var(--foreground)",
                color: "var(--background)",
                border: "none",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {saving ? "..." : t.invoices.issueAndPreview}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
