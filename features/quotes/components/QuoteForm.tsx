"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useQuoteStore } from "@/lib/store/quote";
import {
  createQuote,
  updateQuote,
  generateQuoteNumber,
} from "@/features/quotes/actions";
import { getClients } from "@/features/clients/actions";
import { InvoiceLineRow } from "@/features/invoices/components/InvoiceLineRow";
import { ClientQuickCreate } from "@/features/invoices/components/ClientQuickCreate";
import { InvoiceMetadata } from "@/features/invoices/components/InvoiceMetadata";
import { InvoiceTotals } from "@/features/invoices/components/InvoiceTotals";
import type { QuoteStatus } from "@/lib/types";
import { ErrorMessage } from "@/components/ui";
import { m as motion } from "framer-motion";
import { playSound } from "@/lib/utils/sound";
import { useInvoiceStore } from "@/lib/store/invoice";
import { useLocale } from "@/lib/i18n/context";

interface QuoteFormProps {
  quoteId?: string;
}

export function QuoteForm({ quoteId }: QuoteFormProps) {
  const { t } = useLocale();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);

  const clientId = useQuoteStore((s) => s.clientId);
  const setClientId = useQuoteStore((s) => s.setClientId);
  const quoteNumber = useQuoteStore((s) => s.quoteNumber);
  const setQuoteNumber = useQuoteStore((s) => s.setQuoteNumber);
  const validUntil = useQuoteStore((s) => s.validUntil);
  const setValidUntil = useQuoteStore((s) => s.setValidUntil);
  const lines = useQuoteStore((s) => s.lines);
  const addLine = useQuoteStore((s) => s.addLine);
  const updateLine = useQuoteStore((s) => s.updateLine);
  const removeLine = useQuoteStore((s) => s.removeLine);
  const notes = useQuoteStore((s) => s.notes);
  const setNotes = useQuoteStore((s) => s.setNotes);
  const lastSavedAt = useQuoteStore((s) => s.lastSavedAt);
  const markSaved = useQuoteStore((s) => s.markSaved);
  const toInput = useQuoteStore((s) => s.toInput);

  // Sync quote store → invoice store so shared components (InvoiceMetadata, InvoiceTotals) work
  const invoiceSetClientId = useInvoiceStore((s) => s.setClientId);
  const invoiceSetNotes = useInvoiceStore((s) => s.setNotes);
  const invoiceLoadInvoice = useInvoiceStore((s) => s.loadInvoice);

  // Initialize invoice store from quote store for shared components
  useEffect(() => {
    const state = useQuoteStore.getState();
    invoiceLoadInvoice({
      clientId: state.clientId,
      invoiceNumber: state.quoteNumber,
      issueDate: state.issueDate,
      dueDate: state.validUntil,
      vatRate: state.vatRate,
      vatScheme: "standard",
      notes: state.notes,
      lines: state.lines,
    });
  }, [invoiceLoadInvoice]);

  // Sync quote line changes to invoice store so InvoiceTotals updates
  useEffect(() => {
    const unsub = useQuoteStore.subscribe((quoteState) => {
      const invoiceState = useInvoiceStore.getState();
      // Sync lines and vatRate so totals calculate correctly
      if (
        quoteState.lines !== invoiceState.lines ||
        quoteState.vatRate !== invoiceState.vatRate
      ) {
        useInvoiceStore.setState({
          lines: quoteState.lines,
          vatRate: quoteState.vatRate,
        });
        // Trigger totals recalculation
        useInvoiceStore.getState().setVatRate(quoteState.vatRate);
      }
    });
    return unsub;
  }, []);

  // Sync changes from invoice store back to quote store (for shared components like InvoiceMetadata)
  useEffect(() => {
    const unsub = useInvoiceStore.subscribe((invoiceState) => {
      const quoteState = useQuoteStore.getState();
      if (invoiceState.vatRate !== quoteState.vatRate) {
        useQuoteStore.setState({ vatRate: invoiceState.vatRate });
      }
      if (invoiceState.issueDate !== quoteState.issueDate) {
        useQuoteStore.setState({ issueDate: invoiceState.issueDate });
      }
      if (invoiceState.notes !== quoteState.notes) {
        useQuoteStore.setState({ notes: invoiceState.notes });
      }
    });
    return unsub;
  }, []);

  const { data: clientsResult, isLoading: clientsLoading, isError: clientsError } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });
  const clients = clientsResult?.data ?? [];
  const hasClientError = clientsError || !!clientsResult?.error;
  const clientErrorMessage = clientsResult?.error || t.common.fetchError;

  useEffect(() => {
    if (!quoteId && !quoteNumber) {
      generateQuoteNumber().then((result) => {
        if (result.error) {
          setError(result.error);
        } else if (result.data) {
          setQuoteNumber(result.data);
        }
      });
    }
  }, [quoteId, quoteNumber, setQuoteNumber]);

  const handleSave = async (status: QuoteStatus) => {
    if (!clientId) {
      setError(t.quotes.selectClient);
      return;
    }
    if (!quoteNumber) {
      setError(t.quotes.quoteNumberRequired);
      return;
    }

    setSaving(true);
    setError(null);

    const input = toInput(status);

    let result;
    if (quoteId) {
      result = await updateQuote(quoteId, input);
      if (!result.error) {
        markSaved();
        if (status === "sent") {
          router.push(`/dashboard/quotes/${quoteId}`);
        }
      }
    } else {
      result = await createQuote(input);
      if (!result.error && result.data) {
        markSaved();
        router.push(`/dashboard/quotes/${result.data}`);
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

      {/* Recipient */}
      <div style={{ marginBottom: 48 }}>
        <p className="label" style={{ opacity: 0.2, marginBottom: 8 }}>{t.quotes.recipient}</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              invoiceSetClientId(e.target.value);
              playSound("tink");
            }}
            className="form-input"
            style={{
              fontSize: 14,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              border: "none",
              padding: 0,
              width: "auto",
              minWidth: 160,
              background: "transparent"
            }}
          >
            <option value="">
              {clientsLoading ? t.common.loading : hasClientError ? clientErrorMessage : t.quotes.selectClientPlaceholder}
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setShowNewClient(!showNewClient);
              playSound("glass-ping");
            }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.3 }}
          >
            {showNewClient ? `[-] ${t.common.close.toUpperCase()}` : `[+] ${t.common.new.toUpperCase()}`}
          </button>
        </div>
        {showNewClient && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            style={{ overflow: "hidden", marginTop: 24 }}
          >
            <ClientQuickCreate onClose={() => setShowNewClient(false)} />
          </motion.div>
        )}
      </div>

      {/* Valid until */}
      <div style={{ marginBottom: 40 }}>
        <p className="label" style={{ opacity: 0.2, marginBottom: 8 }}>{t.quotes.validUntilLabel}</p>
        <input
          type="date"
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          className="form-input"
          style={{
            maxWidth: 200,
          }}
        />
      </div>

      {/* Lines */}
      <div style={{ marginBottom: 80 }}>
        <p className="label" style={{ opacity: 0.2, marginBottom: 24 }}>{t.quotes.lines}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {lines.map((line, index) => (
            <InvoiceLineRow
              key={line.id}
              line={line}
              index={index}
              totalLines={lines.length}
              onUpdate={updateLine}
              onRemove={removeLine}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              addLine();
              playSound("tink");
            }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 10, textAlign: "left", padding: "12px 0", opacity: 0.2, letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            {t.quotes.addLine}
          </button>
        </div>
      </div>

      {/* Metadata & Totals (reuse invoice components) */}
      <InvoiceMetadata />

      {/* Notities */}
      <div style={{ marginBottom: 40 }}>
        <p className="label" style={{ opacity: 0.2, marginBottom: 8 }}>{t.quotes.notesLabel}</p>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            invoiceSetNotes(e.target.value);
          }}
          placeholder={t.quotes.notesPlaceholder}
          rows={3}
          className="form-input"
          style={{
            resize: "vertical",
            minHeight: 60,
            fontSize: 13,
            opacity: 0.6,
          }}
        />
      </div>

      <InvoiceTotals />

      {/* Actions */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
        <button
          onClick={() => {
            handleSave("draft");
            playSound("glass-ping");
          }}
          disabled={saving}
          style={{
            flex: 1,
            padding: "24px",
            background: "rgba(0,0,0,0.03)",
            border: "var(--border-rule)",
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            cursor: "pointer"
          }}
        >
          {saving ? "..." : t.quotes.saveDraft}
        </button>
        <button
          onClick={() => {
            handleSave("sent");
            playSound("glass-ping");
          }}
          disabled={saving}
          style={{
            flex: 2,
            padding: "24px",
            background: "var(--foreground)",
            color: "var(--background)",
            border: "none",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            cursor: "pointer",
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)"
          }}
        >
          {saving ? "..." : t.quotes.sendQuote}
        </button>
      </div>

      {lastSavedAt && (
        <p className="mono-amount" style={{ fontSize: 10, opacity: 0.2, marginTop: 40, textAlign: "center" }}>
          PROTOCOL Sync / {new Date(lastSavedAt).toLocaleTimeString("nl-NL")}
        </p>
      )}
    </motion.div>
  );
}
