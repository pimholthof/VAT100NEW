"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useInvoiceStore } from "@/lib/store/invoice";
import {
  createInvoice,
  updateInvoice,
  generateInvoiceNumber,
} from "@/lib/actions/invoices";
import { getClients } from "@/lib/actions/clients";
import { InvoiceLineRow } from "./InvoiceLineRow";
import { ClientQuickCreate } from "./ClientQuickCreate";
import type { VatRate } from "@/lib/types";
import {
  inputStyle,
  ErrorMessage,
} from "@/components/ui";

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
  const issueDate = useInvoiceStore((s) => s.issueDate);
  const setIssueDate = useInvoiceStore((s) => s.setIssueDate);
  const dueDate = useInvoiceStore((s) => s.dueDate);
  const setDueDate = useInvoiceStore((s) => s.setDueDate);
  const vatRate = useInvoiceStore((s) => s.vatRate);
  const setVatRate = useInvoiceStore((s) => s.setVatRate);
  const notes = useInvoiceStore((s) => s.notes);
  const setNotes = useInvoiceStore((s) => s.setNotes);
  const lines = useInvoiceStore((s) => s.lines);
  const addLine = useInvoiceStore((s) => s.addLine);
  const updateLine = useInvoiceStore((s) => s.updateLine);
  const removeLine = useInvoiceStore((s) => s.removeLine);
  const moveLine = useInvoiceStore((s) => s.moveLine);
  const totals = useInvoiceStore((s) => s.totals);
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

  const fmt = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {error && (
        <ErrorMessage style={{ marginBottom: 40 }}>{error}</ErrorMessage>
      )}

      {/* ── Ontvanger ── */}
      <div style={{ marginBottom: 80 }}>
        <p className="label" style={{ opacity: 0.3, marginBottom: 12 }}>ONTVANGER</p>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24 }}>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            style={{
              ...inputStyle,
              fontSize: "2.5rem",
              fontWeight: 400,
              letterSpacing: "-0.04em",
              border: "none",
              padding: 0,
              width: "auto",
              minWidth: 300,
              background: "transparent",
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
            onClick={() => setShowNewClient(!showNewClient)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.2em",
              opacity: 0.3,
            }}
          >
            {showNewClient ? "[-] SLUIT" : "[+] NIEUW"}
          </button>
        </div>
        {showNewClient && (
          <div style={{ marginTop: 24 }}>
            <ClientQuickCreate onClose={() => setShowNewClient(false)} />
          </div>
        )}
      </div>

      {/* ── Regels ── */}
      <div style={{ marginBottom: 80 }}>
        <p className="label" style={{ opacity: 0.3, marginBottom: 24 }}>REGELS</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {lines.map((line, index) => (
            <InvoiceLineRow
              key={line.id}
              line={line}
              index={index}
              totalLines={lines.length}
              onUpdate={updateLine}
              onRemove={removeLine}
              onMove={moveLine}
            />
          ))}
          <button
            type="button"
            onClick={() => addLine()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 10,
              textAlign: "left",
              padding: "12px 0",
              opacity: 0.2,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            + REGEL TOEVOEGEN
          </button>
        </div>
      </div>

      {/* ── Metadata ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 60,
          padding: "40px 0",
          borderTop: "var(--border-rule)",
          borderBottom: "var(--border-rule)",
          marginBottom: 80,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="label">REF</p>
          <input
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            style={{ ...inputStyle, border: "none", padding: 0, opacity: 0.6, fontSize: 13 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="label">DATUM</p>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            style={{ ...inputStyle, border: "none", padding: 0, opacity: 0.6, fontSize: 13 }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p className="label">BTW ({vatRate}%)</p>
          <select
            value={vatRate}
            onChange={(e) => setVatRate(Number(e.target.value) as VatRate)}
            style={{ ...inputStyle, border: "none", padding: 0, opacity: 0.6, fontSize: 13, background: "transparent" }}
          >
            <option value={21}>Hoog (21%)</option>
            <option value={9}>Laag (9%)</option>
            <option value={0}>Nul (0%)</option>
          </select>
        </div>
      </div>

      {/* ── Totaal ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 100 }}>
        <div>
          <p className="label" style={{ opacity: 0.15, marginBottom: 8 }}>TOTAAL</p>
          <p
            className="mono-amount-lg"
            style={{
              fontSize: "6rem",
              lineHeight: 0.8,
              letterSpacing: "-0.04em",
              color: "var(--foreground)",
            }}
          >
            {fmt.format(totals.total)}
          </p>
        </div>
        <div style={{ textAlign: "right", opacity: 0.4 }}>
          <p className="mono-amount" style={{ fontSize: 11, marginBottom: 4 }}>Sub: {fmt.format(totals.subtotal)}</p>
          <p className="mono-amount" style={{ fontSize: 11 }}>BTW: {fmt.format(totals.vatAmount)}</p>
        </div>
      </div>

      {/* ── Acties ── */}
      <div style={{ display: "flex", gap: 24 }}>
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          style={{
            flex: 1,
            padding: "24px",
            background: "transparent",
            border: "var(--border)",
            fontSize: 11,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            cursor: "pointer",
          }}
        >
          {saving ? "..." : "Concept opslaan"}
        </button>
        <button
          onClick={() => handleSave(true)}
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
            letterSpacing: "0.12em",
            cursor: "pointer",
          }}
        >
          {saving ? "..." : "Versturen & Bekijken"}
        </button>
      </div>

      {lastSavedAt && (
        <p className="mono-amount" style={{ fontSize: 10, opacity: 0.2, marginTop: 40, textAlign: "center" }}>
          Opgeslagen / {new Date(lastSavedAt).toLocaleTimeString("nl-NL")}
        </p>
      )}
    </div>
  );
}
