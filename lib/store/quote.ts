import { create } from "zustand";
import type {
  QuoteInput,
  InvoiceLineInput,
  VatRate,
  QuoteStatus,
} from "@/lib/types";
import { calculateLineTotals } from "@/lib/format";
import { createEmptyLine, today, in30Days } from "./shared";

interface QuoteTotals {
  subtotal: number;
  vatAmount: number;
  total: number;
}

function calcTotals(lines: InvoiceLineInput[], vatRate: VatRate): QuoteTotals {
  const vat = calculateLineTotals(lines, vatRate);
  return {
    subtotal: vat.subtotalExVat,
    vatAmount: vat.vatAmount,
    total: vat.totalIncVat,
  };
}


interface QuoteFormState {
  clientId: string;
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  vatRate: VatRate;
  notes: string;
  lines: InvoiceLineInput[];
  totals: QuoteTotals;
  isDirty: boolean;
  lastSavedAt: number | null;

  setClientId: (id: string) => void;
  setQuoteNumber: (num: string) => void;
  setIssueDate: (date: string) => void;
  setValidUntil: (date: string) => void;
  setVatRate: (rate: VatRate) => void;
  setNotes: (notes: string) => void;

  addLine: () => void;
  removeLine: (id: string) => void;
  updateLine: (id: string, field: keyof InvoiceLineInput, value: string | number) => void;

  resetForm: () => void;
  loadQuote: (data: {
    clientId: string;
    quoteNumber: string;
    issueDate: string;
    validUntil: string;
    vatRate: VatRate;
    notes: string;
    lines: InvoiceLineInput[];
  }) => void;
  markSaved: () => void;

  toInput: (status: QuoteStatus) => QuoteInput;
}

export const useQuoteStore = create<QuoteFormState>((set, get) => ({
  clientId: "",
  quoteNumber: "",
  issueDate: today(),
  validUntil: in30Days(),
  vatRate: 21,
  notes: "",
  lines: [createEmptyLine()],
  totals: { subtotal: 0, vatAmount: 0, total: 0 },
  isDirty: false,
  lastSavedAt: null,

  setClientId: (id) => set({ clientId: id, isDirty: true }),
  setQuoteNumber: (num) => set({ quoteNumber: num, isDirty: true }),
  setIssueDate: (date) => set({ issueDate: date, isDirty: true }),
  setValidUntil: (date) => set({ validUntil: date, isDirty: true }),
  setVatRate: (rate) => {
    const { lines } = get();
    set({ vatRate: rate, totals: calcTotals(lines, rate), isDirty: true });
  },
  setNotes: (notes) => set({ notes, isDirty: true }),

  addLine: () => {
    const { lines, vatRate } = get();
    const newLines = [...lines, createEmptyLine()];
    set({ lines: newLines, totals: calcTotals(newLines, vatRate), isDirty: true });
  },

  removeLine: (id) => {
    const { lines, vatRate } = get();
    if (lines.length <= 1) return;
    const newLines = lines.filter((l) => l.id !== id);
    set({ lines: newLines, totals: calcTotals(newLines, vatRate), isDirty: true });
  },

  updateLine: (id, field, value) => {
    const { lines, vatRate } = get();
    const newLines = lines.map((l) => {
      if (l.id !== id) return l;
      return { ...l, [field]: value };
    });
    set({ lines: newLines, totals: calcTotals(newLines, vatRate), isDirty: true });
  },

  resetForm: () =>
    set({
      clientId: "",
      quoteNumber: "",
      issueDate: today(),
      validUntil: in30Days(),
      vatRate: 21,
      notes: "",
      lines: [createEmptyLine()],
      totals: { subtotal: 0, vatAmount: 0, total: 0 },
      isDirty: false,
      lastSavedAt: null,
    }),

  loadQuote: (data) => {
    const totals = calcTotals(data.lines, data.vatRate);
    set({
      ...data,
      totals,
      isDirty: false,
      lastSavedAt: Date.now(),
    });
  },

  markSaved: () => set({ isDirty: false, lastSavedAt: Date.now() }),

  toInput: (status) => {
    const s = get();
    return {
      client_id: s.clientId,
      quote_number: s.quoteNumber,
      status,
      issue_date: s.issueDate,
      valid_until: s.validUntil || null,
      vat_rate: s.vatRate,
      notes: s.notes || null,
      lines: s.lines.filter((l) => l.description.trim() !== ""),
    };
  },
}));
