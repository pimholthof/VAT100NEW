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
import { InvoiceLineRow } from "./InvoiceLineRow";
import { ClientQuickCreate } from "./ClientQuickCreate";
import { InvoiceMetadata } from "./InvoiceMetadata";
import { InvoiceTotals } from "./InvoiceTotals";
import type { VatRate } from "@/lib/types";
import {
  inputStyle,
  ErrorMessage,
} from "@/components/ui";
import { m as motion  } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { playSound } from "@/lib/utils/sound";

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
  const notes = useInvoiceStore((s) => s.notes);
  const setNotes = useInvoiceStore((s) => s.setNotes);
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
      const result = await updateInvoice(invoiceId, s.toInput("draft"));
      if (result.error) {
        setError(`Auto-save mislukt: ${result.error}`);
        return;
      }
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
      <div style={{ marginBottom: 80 }}>
        <p className="label" style={{ opacity: 0.2, marginBottom: 12 }}>ONTVANGER</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
          <select
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              playSound("tink");
            }}
            style={{ 
              ...inputStyle, 
              fontSize: "2.5rem", 
              fontWeight: 400, 
              letterSpacing: "-0.04em",
              border: "none",
              padding: 0,
              width: "auto",
              minWidth: 300,
              background: "transparent"
            }}
          >
            <option value="">
              {clientsLoading ? "Laden..." : hasClientError ? clientErrorMessage : "Selecteer klant"}
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              setShowNewClient(!showNewClient);
              playSound("glass-ping");
            }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              opacity: 0.3
            }}
          >
            {showNewClient ? "[-] SLUITEN" : "[+] NIEUW"}
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

      {/* ── The Sum: Invoicing as Expression ── */}
      <div style={{ marginBottom: 80 }}>
        <p className="label" style={{ opacity: 0.2, marginBottom: 24 }}>REGELS</p>
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
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 10,
              textAlign: "left",
              padding: "12px 0",
              opacity: 0.2,
              letterSpacing: "0.1em",
              textTransform: "uppercase"
            }}
          >
            + REGEL TOEVOEGEN
          </button>
        </div>
      </div>

      {/* ── Metadata: Precision lines ── */}
      <InvoiceMetadata />

      {/* ── Notities ── */}
      <div style={{ marginBottom: 40 }}>
        <p className="label" style={{ opacity: 0.2, marginBottom: 8 }}>NOTITIES</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optionele notities (zichtbaar op factuur)"
          rows={3}
          style={{
            ...inputStyle,
            resize: "vertical",
            minHeight: 60,
            fontSize: 13,
            opacity: 0.6,
          }}
        />
      </div>

      {/* ── The Monolith: Total ── */}
      <InvoiceTotals />

      {/* ── Actions: The VanMoof Unlock ── */}
      <div style={{ display: "flex", gap: 24 }}>
        <button
          onClick={() => {
            handleSave(false);
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
          {saving ? "..." : "Bewaar concept"}
        </button>
        <button
          onClick={() => {
            handleSave(true);
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
          {saving ? "..." : "Verstuur & Bekijk"}
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


