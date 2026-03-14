"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useInvoiceStore } from "@/lib/store/invoice";
import { getInvoice } from "@/lib/actions/invoices";
import { InvoiceForm } from "@/components/invoice/InvoiceForm";
import type { VatRate } from "@/lib/types";

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const loadInvoice = useInvoiceStore((s) => s.loadInvoice);

  const { data: result, isLoading } = useQuery({
    queryKey: ["invoice", params.id],
    queryFn: () => getInvoice(params.id),
  });

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
        })),
      });
    }
  }, [result?.data, loadInvoice]);

  if (isLoading) {
    return (
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-lg)",
          fontWeight: 300,
        }}
      >
        Laden...
      </p>
    );
  }

  if (result?.error) {
    return (
      <p
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: "var(--text-body-lg)",
          fontWeight: 400,
        }}
      >
        Fout: {result.error}
      </p>
    );
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-display), sans-serif",
          fontSize: "var(--text-display-md)",
          fontWeight: 900,
          letterSpacing: "var(--tracking-display)",
          lineHeight: 1,
          margin: "0 0 32px",
        }}
      >
        Factuur {result?.data?.invoice_number}
      </h1>
      <InvoiceForm invoiceId={params.id} />
    </div>
  );
}
