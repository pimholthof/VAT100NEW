import { create } from "zustand";
import type {
  InvoiceInput,
  InvoiceLineInput,
  VatRate,
} from "@/lib/types";
import { calculateLineTotals } from "@/lib/format";

function createEmptyLine(): InvoiceLineInput {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit: "uren",
    rate: 0,
  };
}

interface InvoiceTotals {
  subtotal: number;
  vatAmount: number;
  total: number;
}

function calcTotals(lines: InvoiceLineInput[], vatRate: VatRate): InvoiceTotals {
  const vat = calculateLineTotals(lines, vatRate);
  return {
    subtotal: vat.subtotalExVat,
    vatAmount: vat.vatAmount,
    total: vat.totalIncVat,
  };
}

interface InvoiceFormState {
  // Form fields
  clientId: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  vatRate: VatRate;
  notes: string;
  lines: InvoiceLineInput[];

  // Computed
  totals: InvoiceTotals;

  // Dirty tracking for auto-save
  isDirty: boolean;
  lastSavedAt: number | null;

  // Actions
  setClientId: (id: string) => void;
  setInvoiceNumber: (num: string) => void;
  setIssueDate: (date: string) => void;
  setDueDate: (date: string) => void;
  setVatRate: (rate: VatRate) => void;
  setNotes: (notes: string) => void;

  addLine: () => void;
  removeLine: (id: string) => void;
  updateLine: (id: string, field: keyof InvoiceLineInput, value: string | number) => void;
  moveLine: (id: string, direction: "up" | "down") => void;

  resetForm: () => void;
  loadInvoice: (data: {
    clientId: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    vatRate: VatRate;
    notes: string;
    lines: InvoiceLineInput[];
  }) => void;
  markSaved: () => void;

  toInput: (status: "draft" | "sent") => InvoiceInput;
}

const today = () => new Date().toISOString().split("T")[0];
const in30Days = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
};

export const useInvoiceStore = create<InvoiceFormState>((set, get) => ({
  clientId: "",
  invoiceNumber: "",
  issueDate: today(),
  dueDate: in30Days(),
  vatRate: 21,
  notes: "",
  lines: [createEmptyLine()],
  totals: { subtotal: 0, vatAmount: 0, total: 0 },
  isDirty: false,
  lastSavedAt: null,

  setClientId: (id) => set({ clientId: id, isDirty: true }),
  setInvoiceNumber: (num) => set({ invoiceNumber: num, isDirty: true }),
  setIssueDate: (date) => set({ issueDate: date, isDirty: true }),
  setDueDate: (date) => set({ dueDate: date, isDirty: true }),
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

  moveLine: (id, direction) => {
    const { lines, vatRate } = get();
    const idx = lines.findIndex((l) => l.id === id);
    if (idx === -1) return;
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === lines.length - 1) return;

    const newLines = [...lines];
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    [newLines[idx], newLines[swapIdx]] = [newLines[swapIdx], newLines[idx]];
    set({ lines: newLines, totals: calcTotals(newLines, vatRate), isDirty: true });
  },

  resetForm: () =>
    set({
      clientId: "",
      invoiceNumber: "",
      issueDate: today(),
      dueDate: in30Days(),
      vatRate: 21,
      notes: "",
      lines: [createEmptyLine()],
      totals: { subtotal: 0, vatAmount: 0, total: 0 },
      isDirty: false,
      lastSavedAt: null,
    }),

  loadInvoice: (data) => {
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
      invoice_number: s.invoiceNumber,
      status,
      issue_date: s.issueDate,
      due_date: s.dueDate || null,
      vat_rate: s.vatRate,
      notes: s.notes || null,
      lines: s.lines.filter((l) => l.description.trim() !== ""),
    };
  },
}));
