"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useInvoiceStore } from "@/lib/store/invoice";
import { getClients } from "@/features/clients/actions";
import { getProfile } from "@/features/profile/actions";
import { useLocale } from "@/lib/i18n/context";
import { calculateInvoiceTotals } from "@/lib/logic/invoice-calculations";
import { InvoiceHTML } from "./InvoiceHTML";
import { TemplatePicker } from "./TemplatePicker";
import type {
  Client,
  Invoice,
  InvoiceData,
  InvoiceLine,
  InvoiceTemplate,
  Profile,
} from "@/lib/types";

const STORAGE_KEY = "vat100-invoice-template";
const A4_WIDTH = 595;
const A4_HEIGHT = 842;

const PLACEHOLDER_CLIENT: Client = {
  id: "__preview__",
  user_id: "__preview__",
  name: "Klantnaam",
  contact_name: null,
  email: null,
  address: null,
  city: null,
  postal_code: null,
  kvk_number: null,
  btw_number: null,
  country: "NL",
  payment_terms_days: 30,
  archived_at: null,
  created_at: new Date().toISOString(),
};

const PLACEHOLDER_PROFILE: Profile = {
  id: "__preview__",
  full_name: "Jouw naam",
  studio_name: null,
  kvk_number: null,
  btw_number: null,
  address: null,
  city: null,
  postal_code: null,
  iban: null,
  bic: null,
  logo_path: null,
  vat_frequency: null,
  bookkeeping_start_date: null,
  onboarding_completed_at: null,
  onboarding_dismissed_at: null,
  uses_kor: false,
  estimated_annual_income: null,
  meets_urencriterium: false,
  created_at: new Date().toISOString(),
};

interface InvoiceLivePreviewProps {
  invoiceId?: string;
  isCreditNote?: boolean;
  scale?: number;
  mode?: "sticky" | "inline";
}

export function InvoiceLivePreview({
  invoiceId,
  isCreditNote = false,
  scale = 0.66,
  mode = "sticky",
}: InvoiceLivePreviewProps) {
  const { locale } = useLocale();

  const [template, setTemplate] = useState<InvoiceTemplate>(() => {
    if (typeof window === "undefined") return "poster";
    const saved = localStorage.getItem(STORAGE_KEY) as InvoiceTemplate | null;
    if (saved && ["minimaal", "klassiek", "strak", "poster", "editoriaal"].includes(saved)) {
      return saved;
    }
    return "poster";
  });

  function handleTemplateChange(t: InvoiceTemplate) {
    setTemplate(t);
    localStorage.setItem(STORAGE_KEY, t);
  }

  const clientId = useInvoiceStore((s) => s.clientId);
  const invoiceNumber = useInvoiceStore((s) => s.invoiceNumber);
  const issueDate = useInvoiceStore((s) => s.issueDate);
  const dueDate = useInvoiceStore((s) => s.dueDate);
  const vatRate = useInvoiceStore((s) => s.vatRate);
  const vatScheme = useInvoiceStore((s) => s.vatScheme);
  const notes = useInvoiceStore((s) => s.notes);
  const lines = useInvoiceStore((s) => s.lines);

  const { data: profileResult } = useQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
    staleTime: 5 * 60_000,
  });
  const { data: clientsResult } = useQuery({
    queryKey: ["clients"],
    queryFn: () => getClients(),
  });

  const profile = profileResult?.data ?? PLACEHOLDER_PROFILE;
  const clients = clientsResult?.data ?? [];
  const selectedClient = clients.find((c) => c.id === clientId) ?? PLACEHOLDER_CLIENT;

  const data: InvoiceData = useMemo(() => {
    const totals = calculateInvoiceTotals(lines, vatRate);
    const invoice: Invoice = {
      id: invoiceId ?? "__preview__",
      user_id: profile.id,
      client_id: selectedClient.id,
      invoice_number: invoiceNumber || "—",
      status: "draft",
      issue_date: issueDate,
      due_date: dueDate || null,
      sent_via: null,
      subtotal_ex_vat: totals.subtotalExVat,
      vat_rate: vatRate,
      vat_amount: totals.vatAmount,
      total_inc_vat: totals.totalIncVat,
      notes: notes || null,
      share_token: null,
      is_credit_note: isCreditNote,
      original_invoice_id: null,
      payment_link: null,
      mollie_payment_id: null,
      payment_method: null,
      vat_scheme: vatScheme,
      pdf_template: template,
      archived_at: null,
      created_at: new Date().toISOString(),
    };
    const previewLines: InvoiceLine[] = lines.map((l, i) => ({
      id: l.id,
      invoice_id: invoice.id,
      description: l.description || "—",
      quantity: l.quantity,
      unit: l.unit,
      rate: l.rate,
      amount: Math.round(l.quantity * l.rate * 100) / 100,
      sort_order: i,
    }));
    return { invoice, lines: previewLines, client: selectedClient, profile };
  }, [
    invoiceId,
    profile,
    selectedClient,
    invoiceNumber,
    issueDate,
    dueDate,
    vatRate,
    vatScheme,
    notes,
    lines,
    isCreditNote,
    template,
  ]);

  const deferredData = useDeferredValue(data);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        position: mode === "sticky" ? "sticky" : "static",
        top: mode === "sticky" ? 24 : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "var(--text-label)",
            letterSpacing: "var(--tracking-label)",
            textTransform: "uppercase",
            opacity: 0.55,
            fontWeight: 500,
          }}
        >
          Live voorbeeld
        </span>
        <TemplatePicker value={template} onChange={handleTemplateChange} />
      </div>
      <div
        style={{
          width: A4_WIDTH * scale,
          height: A4_HEIGHT * scale,
          overflow: "hidden",
          border: "var(--border-rule)",
          background: "#fff",
          boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          alignSelf: "flex-start",
        }}
        aria-label="Live factuurvoorbeeld"
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: A4_WIDTH,
            height: A4_HEIGHT,
            pointerEvents: "none",
          }}
        >
          <InvoiceHTML data={deferredData} template={template} locale={locale} />
        </div>
      </div>
    </div>
  );
}
